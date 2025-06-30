import React, { useRef, useEffect, useState } from "react";

export default function DoodleClassifier() {
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [prediction, setPrediction] = useState("Loading Teachable Machine model...");
  const [loading, setLoading] = useState(true);

  const classes = [
     "apple", "banana", "cat", "car", "house", 
      "fish", "chair", "umbrella", "sun", "hand"
  ];

  const modelURL = "https://teachablemachine.withgoogle.com/models/n6MXzC6RB/"; // Replace with your model URL

  useEffect(() => {
    async function loadModel() {
      const tmImage = window.tmImage;
      const loadedModel = await tmImage.load(
        modelURL + "model.json",
        modelURL + "metadata.json"
      );
      setModel(loadedModel);
      setPrediction("Model ready! Draw and submit.");
      setLoading(false);
    }
    loadModel();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 15;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    let drawing = false;

    const getXY = (e) => {
      if (e.touches && e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return { x: e.offsetX, y: e.offsetY };
    };

    const start = (e) => {
      drawing = true;
      const { x, y } = getXY(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e) => {
      if (!drawing) return;
      const { x, y } = getXY(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stop = () => {
      drawing = false;
      ctx.beginPath();
    };

    // Mouse events
    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stop);
    canvas.addEventListener("mouseleave", stop);

    // Touch events
    canvas.addEventListener("touchstart", start);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", stop);
    canvas.addEventListener("touchcancel", stop);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stop);
      canvas.removeEventListener("mouseleave", stop);

      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stop);
      canvas.removeEventListener("touchcancel", stop);
    };
  }, []);


  const handleSubmit = async () => {
    if (!model) return;

    const sourceCanvas = canvasRef.current;

    // Step 1: Copy drawing into a high-quality image with white background
    const resizedCanvas = document.createElement("canvas");
    const SIZE = 400;
    resizedCanvas.width = SIZE;
    resizedCanvas.height = SIZE;
    const ctx = resizedCanvas.getContext("2d");

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Draw scaled image
    ctx.drawImage(sourceCanvas, 0, 0, SIZE, SIZE);

    const preds = await model.predict(resizedCanvas);
    // console.log("Predictions:", preds);

    // Find the prediction with the highest probability
    const top = preds.reduce((best, p) => (p.probability > best.probability ? p : best), preds[0]);

    if (top && top.className && top.probability !== undefined) {
      setPrediction(`🧠 I guessed: ${top.className} (${(top.probability * 100).toFixed(1)}%)`);
    } else {
      setPrediction("Prediction failed. Check the model or drawing.");
    }

  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPrediction("Canvas cleared. Draw again!");
  };

  return (
    <div style={{ textAlign: "center", padding: "20px", color: "#000" }}>
      <p style={{ fontSize: "1.1em", marginBottom: "0.8em" }}>
        Try drawing any one of the following:
        <br />
        <strong>{classes.join(", ")}</strong>
      </p>

      <h2>🎨 Doodle Classifier (Teachable Machine)</h2>

      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        style={{
          border: "2px solid black",
          background: "#fff",
          touchAction: "none",
          marginTop: "10px",
          maxWidth: "100%",
          height: "auto"
        }}
      />



      <div style={{ textAlign: "center", padding: "20px", maxWidth: "95vw", margin: "0 auto" }}>

        <div style={{ marginTop: 10 }}>
        <button onClick={handleSubmit} disabled={loading} style={{ padding: "8px 16px", fontSize: "1em" }}>
          Submit
        </button>
        <button onClick={handleClear} style={{ padding: "8px 16px", marginLeft: "10px", fontSize: "1em" }}>
          Clear
        </button>
        </div>
      </div>

      <p style={{ marginTop: 20, fontSize: "1.2em" }}>{prediction}</p>
    </div>
  );
}
