import { useEffect, useRef, useState } from "react";
import "@mediapipe/camera_utils";
import "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Hands ,HAND_CONNECTIONS} from "@mediapipe/hands";
import { Pose,POSE_CONNECTIONS } from "@mediapipe/pose";

export default function LandmarkSwitcher() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);
  const [mode, setMode] = useState("pose"); // or "hand"
  const [loading, setLoading] = useState(false);


  const initModel = async (selectedMode) => {
    if (modelRef.current) {
      await modelRef.current.close(); // clean previous model
      modelRef.current = null;
    }

    const canvasCtx = canvasRef.current.getContext("2d");
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;

    if (selectedMode === "hand") {
      modelRef.current = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      modelRef.current.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      modelRef.current.onResults((results) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.globalAlpha = 0.3;
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.globalAlpha = 1.0;

        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: "#FFFF00", lineWidth: 3 });
            drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 2 });
          }
        }

        canvasCtx.restore();
      });
    } else {
      modelRef.current = new Pose({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      modelRef.current.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      modelRef.current.onResults((results) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.globalAlpha = 0.3;
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.globalAlpha = 1.0;

        if (results.poseLandmarks) {
          drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: "#FFFF00", lineWidth: 3 });
          drawLandmarks(canvasCtx, results.poseLandmarks, { color: "#FF0000", lineWidth: 2 });
        }

        canvasCtx.restore();
      });
    }

    await modelRef.current.initialize();

    if (!cameraRef.current) {
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (modelRef.current) {
            await modelRef.current.send({ image: videoRef.current });
          }
        },
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    cameraRef.current.start();
  };

 useEffect(() => {
    let isCancelled = false;

    const delayedInit = async () => {
        setLoading(true); // show loading
        // Clean up old model and camera before delay
        if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
        }

        try {
        if (modelRef.current) {
            await modelRef.current.close();
            modelRef.current = null;
        }
        } catch (e) {
        console.warn("Model already deleted or not initialized:", e.message);
        }

        await new Promise((res) => setTimeout(res, 3000)); // wait 3s

        if (!isCancelled) {
        await initModel(mode);
        }
        setLoading(false); // hide loading
    };

    delayedInit();

    return () => {
        isCancelled = true;
    };
    }, [mode]);


  return (
    <div>
    <div style={{
        position: "absolute",
        top: 1,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        background: "rgba(255,255,255,0.8)",
        padding: "10px",
        borderRadius: "8px"
    }}>
        <button disabled={loading} onClick={() => setMode("hand")} style={buttonStyle(mode === "hand")}>
        Hand Mode
        </button>
        <button disabled={loading} onClick={() => setMode("pose")} style={buttonStyle(mode === "pose")}>
        Pose Mode
        </button>
    </div>
    <div style={{
    position: "relative",
    width: "800px",
    height: "700px",
    margin: "0 auto",
    border: "2px solid black",
    borderRadius: "12px",
    overflow: "hidden",
    }}>
    <video
        ref={videoRef}
        style={{
        display: "none",
        transform: "scaleX(-1)" // Mirror webcam input
        }}
    />
    <canvas
        ref={canvasRef}
        style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        transform: "scaleX(-1)", // Mirror output too
        }}
    />
    
    </div>
    </div>
  );
}

function buttonStyle(active) {
  return {
    marginRight: "10px",
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: active ? "#00bfa5" : "#ccc",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  };
}
