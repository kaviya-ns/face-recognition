from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
import face_recognition
import numpy as np
from datetime import datetime
import time
import base64
import cv2
import os
from dotenv import load_dotenv
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.llms import HuggingFaceHub
from langchain.chat_models import ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_community.llms import OpenAI
from langchain.text_splitter import CharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.docstore.document import Document
from langchain_community.embeddings import HuggingFaceEmbeddings

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
hf_api_key = os.getenv("HF_API_KEY")

# Configure LLM based on available API keys
use_openai = bool(openai_api_key)

use_openai=True
if not openai_api_key:
    use_openai = False

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["face_recognition_db"]
coll = db["registrations"]

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name")
    img_b64 = data.get("image")  # data:image/png;base64,AAA...

    # validate
    if not name or not img_b64:
        return jsonify({"error": "Name and image are required"}), 400

    # strip header and decode base64
    header, encoded = img_b64.split(",", 1)
    img_bytes = base64.b64decode(encoded)
    np_img = np.frombuffer(img_bytes, dtype=np.uint8)
    frame = cv2.imdecode(np_img, flags=cv2.IMREAD_COLOR)

    # detect faces + compute encodings
    locations = face_recognition.face_locations(frame)
    if len(locations) != 1:
        return jsonify(
          {"error": "Please capture exactly one clear face"}), 400

    encoding = face_recognition.face_encodings(frame, locations)[0]
    # Convert to regular Python list for JSON / Mongo storage
    encoding_list = encoding.tolist()

    # build document
    doc = {
      "name": name,
      "encoding": encoding_list,
      "registered_at": datetime.utcnow()
    }

    # insert (handles multiple unique registrations)
    try:
        coll.insert_one(doc)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"status": "ok"}), 200

def load_known_faces():
    known_encodings = []
    known_names = []
    for person in coll.find():
        known_encodings.append(np.array(person["encoding"]))
        known_names.append(person["name"])
    return known_encodings, known_names

known_encodings, known_names = load_known_faces()
video_capture = cv2.VideoCapture(0)

def generate_frames():
    while True:
        success, frame = video_capture.read()
        if not success:
            break

        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        face_names = []
        for face_encoding in face_encodings:
            matches = face_recognition.compare_faces(known_encodings, face_encoding)
            name = "Unknown"

            face_distances = face_recognition.face_distance(known_encodings, face_encoding)
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = known_names[best_match_index]

            face_names.append(name)

        for (top, right, bottom, left), name in zip(face_locations, face_names):
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            cv2.rectangle(frame, (left, bottom - 25), (right, bottom), (0, 255, 0), cv2.FILLED)
            cv2.putText(frame, name, (left + 6, bottom - 6),
                        cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 0), 1)

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        time.sleep(0.5)  # limit FPS to reduce CPU usage
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route("/api/query", methods=["POST"])
def query():
    data = request.get_json()
    question = data.get("question", "")

    if not question:
        return jsonify({"error": "Question is required"}), 400

    docs = []
    for doc in coll.find().sort("registered_at", ASCENDING):
        content = (
            f"Name: {doc['name']}\n"
            f"Registered At: {doc['registered_at'].strftime('%Y-%m-%d %H:%M:%S')}\n"
        )
        docs.append(Document(page_content=content, metadata={"name": doc["name"]}))

    if not docs:
        return jsonify({"answer": "No registration data available."})

    text_splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=0)
    split_docs = text_splitter.split_documents(docs)

    if use_openai:
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        llm = ChatOpenAI(model_name="gpt-3.5-turbo")
    else:
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

        llm = HuggingFaceHub(
            repo_id="HuggingFaceH4/zephyr-7b-beta",  
            model_kwargs={"temperature": 0.5, "max_new_tokens": 512},
            huggingfacehub_api_token=hf_api_key

        )
    prompt_template = """
    You are a helpful assistant. Answer the following question based on the provided registration data.

    Registration Data:
    {documents}

    Question: {question}

    Answer:
    """

    # Construct the final prompt using the registration documents and the user's question
    prompt = prompt_template.format(
        documents="\n".join([doc.page_content for doc in split_docs]),
        question=question
    )

    db = FAISS.from_documents(split_docs, embeddings)
    retriever = db.as_retriever()
    qa = RetrievalQA.from_chain_type(llm=llm, chain_type="stuff", retriever=retriever)

    result = qa.run(prompt)
    return jsonify({"answer": result})

if __name__ == "__main__":
    app.run(host="0.0.0.0",port=5000, debug=True,use_reloader=False)
