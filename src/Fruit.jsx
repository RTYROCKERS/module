import { useEffect, useRef, useState } from "react";
//import "@mediapipe/hands";
import "@mediapipe/camera_utils";
import "@mediapipe/drawing_utils";
//import wasmURL from "@mediapipe/hands/hands_solution_simd_wasm_bin.wasm?url";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
const Fruit = () => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const fruitsStartedRef = useRef(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const margin =200;
  const canvasRef = useRef(null);
  const scoreRef=useRef(0);
  const handCanvasRef = useRef(null);
  const fruitIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const handPath = useRef([]);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const juiceEffects = useRef([]);
  const fruits = useRef([]);
  const isMounted = useRef(true);
  const fruitImages = ["🍌","🥝", "🍎","🍉", "🍇"];
 
  // Calculate base fruit size relative to screen width (adjust factor as needed)
  const getBaseFruitSize = () => Math.max(window.innerWidth * 0.06, 30); // at least 30px

  // Update canvas dimensions responsively
  const updateCanvasSize = () => {
    if (canvasRef.current && handCanvasRef.current) {
      const canvas = canvasRef.current;
      const canvas2 = handCanvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas2.width = window.innerWidth;
      canvas2.height = window.innerHeight;
    }
  };
  
  useEffect(() => {
    const updateCanvasSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight }); // Force re-render
    };

    window.addEventListener("resize", updateCanvasSize);
    
    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    const handCanvas = handCanvasRef.current;
    if (canvas && handCanvas) {
      canvas.width = windowSize.width-30;
      canvas.height = windowSize.height;
      handCanvas.width = windowSize.width;
      handCanvas.height = windowSize.height;
    }
  }, [windowSize]); // Runs every time windowSize changes

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    const canvas = canvasRef.current;
    const canvas2 = handCanvasRef.current;
    
    const ctx = canvas.getContext("2d");
    const ctx2 = canvas2.getContext("2d");

    // Initialize Hands if not already done
    if (!handsRef.current) {
      handsRef.current = new Hands({
        locateFile: (file) =>
           `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
    }
    handsRef.current.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    
    // Set up the onResults callback for hand tracking
    handsRef.current.onResults((results) => {
      if (results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        // Map hand coordinates to full screen
        const x = (1 - indexTip.x) * window.innerWidth;
        const y = indexTip.y * window.innerHeight;
        handPath.current.push({ x, y });
        if (handPath.current.length > 6) handPath.current.shift();
        drawHandPath(ctx2, canvas2);
        checkFruitCollision();
      }
    });

    // Create video element for MediaPipe
    if (!videoRef.current) {
      videoRef.current = document.createElement("video");
      videoRef.current.setAttribute("autoplay", "");
      videoRef.current.setAttribute("playsinline", "");
    }

    // Initialize and start the camera
    if (!cameraRef.current) {
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (isMounted.current && handsRef.current) {
            
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      cameraRef.current.start();
    }
    isMounted.current = true;
    setTimeout(() => {
      fruitsStartedRef.current=true; // Start spawning fruits after delay
    }, 4000);
    // Fruit and Juice drawing loop
    const drawFruits = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      
      const baseFruitSize = getBaseFruitSize();
      // Draw fruits with dynamic font size
      fruits.current.forEach((fruit) => {
        ctx.font = `${baseFruitSize}px Arial`;
        ctx.fillText(fruit.type, fruit.x, fruit.y);
        fruit.y += fruit.speed;
      });
      
 
      fruits.current = fruits.current.filter((fruit) => {
        if (fruit.y > window.innerHeight) {
          setLives((prev) => Math.max(prev - 1, 0));
          return false; // remove it
        }
        return true; // keep it
      });
      // Draw juice effects
      juiceEffects.current.forEach((juice, index) => {
        ctx.font = `${baseFruitSize}px Arial`;
        ctx.globalAlpha = juice.timer / 30;
        ctx.fillText(juice.type, juice.x, juice.y);
        ctx.globalAlpha = 1.0;
        juice.timer--;
        if (juice.timer <= 0) {
          juiceEffects.current.splice(index, 1);
        }
      });
      requestAnimationFrame(drawFruits);
    };

    drawFruits();
  fruitIntervalRef.current = setInterval(() => {
    if (fruitsStartedRef.current && !gameOver) {
      spawnFruit();
    }
  }, 1000);
  


   return () => {
    isMounted.current = false;

    if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
    }

    if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
    }

    if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
    }

    window.removeEventListener("resize", updateCanvasSize);
};

  }, []);
  useEffect(() => {
    if (!gameOver && !fruitIntervalRef.current) {
      fruitIntervalRef.current = setInterval(() => {
        if (fruitsStartedRef.current && !gameOver) {
          spawnFruit();
        }
      }, 1000);
    }

    return () => {
      if (fruitIntervalRef.current) {
        clearInterval(fruitIntervalRef.current);
        fruitIntervalRef.current = null;
      }
    };
  }, [gameOver]);

  useEffect(() => {
    if (lives === 0 && !gameOver) {
      setGameOver(true); // Set game over state
    }
  }, [lives, gameOver]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    if (gameOver && fruitIntervalRef.current) {
      clearInterval(fruitIntervalRef.current);
      fruitIntervalRef.current = null;
    }
  }, [gameOver]);

  // Spawn fruits with dynamic size scaling
  const spawnFruit = () => {
    const baseFruitSize = getBaseFruitSize();
    const margin = 200; 
    const xMin = margin;
    const xMax = window.innerWidth - margin - baseFruitSize;
    const x = xMin + Math.random() * (xMax - xMin);
    
    // 2) start anywhere in top half
    const y = Math.random() * (window.innerHeight / 4);
    let minSpeed, maxSpeed;
    if (scoreRef.current < 50) {
      minSpeed = 5;  maxSpeed = 10;
    } else if (scoreRef.current < 100) {
      minSpeed = 10; maxSpeed = 15;
    } else {
      minSpeed = 15; maxSpeed = 20;
    }

    // random in [min,max]
    const chosenFactor = minSpeed + Math.random() * (maxSpeed - minSpeed);
    fruits.current.push({
      x,
      y,
      speed: chosenFactor * (window.innerHeight / 800), // speed scales with height
      type: fruitImages[Math.floor(Math.random() * fruitImages.length)],
      size: baseFruitSize, // store size for scaling hitboxes
    });
  };

  // Draw the hand path
  const drawHandPath = (ctx2, canvas) => {
    ctx2.clearRect(0, 0, canvas.width, canvas.height);
    ctx2.beginPath();
    ctx2.lineWidth = 6;
    ctx2.strokeStyle = "rgba(255, 255, 0, 0.8)";
    ctx2.shadowColor = "rgba(255, 255, 0, 0.9)";
    ctx2.shadowBlur = 15;
    ctx2.lineJoin = "miter";
    handPath.current.forEach((point, i) => {
      if (i === 0) ctx2.moveTo(point.x, point.y);
      else ctx2.lineTo(point.x, point.y);
    });
    ctx2.stroke();
  };

  // ------------------
  // Custom Fruit Hitbox Functions with Scaling
  // Each function accepts an additional scale parameter
  // Assume original size is based on 50 units
  
  function createHexagon(x, y, scale = 1) {
    let size = 50 * scale;
    return [
      { x: x - size + 50 * scale, y: y - size / 2 - 35 * scale },
      { x: x + 50 * scale, y: y - size - 35 * scale },
      { x: x + size + 50 * scale, y: y - size / 2 - 35 * scale },
      { x: x + size + 50 * scale, y: y + size / 2 - 35 * scale },
      { x: x + 50 * scale, y: y + size - 35 * scale },
      { x: x - size + 50 * scale, y: y + size / 2 - 35 * scale },
    ];
  }

  function createCurvedBanana(x, y, scale = 1) {
    return [
      { x: x + 10 * scale, y: y - 70 * scale },
      { x: x + 30 * scale, y: y - 80 * scale },
      { x: x + 50 * scale, y: y - 75 * scale },
      { x: x + 60 * scale, y: y - 60 * scale },
      { x: x + 85 * scale, y: y - 30 * scale },
      { x: x + 99 * scale, y: y + 15 * scale },
      { x: x + 20 * scale, y: y + 20 * scale },
      { x: x + 10 * scale, y: y },
      { x: x + 10 * scale, y: y - 30 * scale },
    ];
  }

  function createOval(x, y, scale = 1) {
    return [
      { x: x + 10 * scale, y: y - 40 * scale },
      { x: x + 10 * scale, y: y - 60 * scale },
      { x: x + 40 * scale, y: y - 80 * scale },
      { x: x + 60 * scale, y: y - 50 * scale },
      { x: x + 100 * scale, y: y - 10 * scale },
      { x: x + 30 * scale, y: y + 10 * scale },
    ];
  }

  function createGrapeCluster(x, y, scale = 1) {
    return [
      { x: x + 15 * scale, y: y - 70 * scale },
      { x: x + 90 * scale, y: y - 60 * scale },
      { x: x + 90 * scale, y: y - 20 * scale },
      { x: x + 100 * scale, y: y - 0 * scale },
      { x: x + 30 * scale, y: y + 10 * scale },
    ];
  }

  function createPentagon(x, y, scale = 1) {
    let size = 50 * scale;
    let points = [];
    for (let i = 0; i < 5; i++) {
      let angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      points.push({
        x: x + size * Math.cos(angle) + 57 * scale,
        y: y + size * Math.sin(angle) - 35 * scale,
      });
    }
    return points;
  }

  // Map fruit types to hitbox functions
  const fruitHitboxes = {
    "🍎": createHexagon,
    "🍌": createCurvedBanana,
    "🍉": createOval,
    "🍇": createGrapeCluster,
    "🥝": createPentagon,
  };

  // Collision detection using custom hitboxes
  const checkFruitCollision = () => {
    const survivingFruits = [];  // <-- Move this outside
  
    fruits.current.forEach((fruit) => {
      const scale = Math.max(getBaseFruitSize() / 90, 0.4);
      const polygon = fruitHitboxes[fruit.type](fruit.x, fruit.y, scale);
      let hit = false;
  
      for (let i = 0; i < handPath.current.length - 1; i++) {
        let p1 = handPath.current[i];
        let p2 = handPath.current[i + 1];
        if (polygonIntersectsLine(polygon, p1, p2)) {
          juiceEffects.current.push({ x: fruit.x, y: fruit.y, type: "🍹", timer: 30 });
          setScore((prev) => prev + 1);
          hit = true;
          break;  // No need to check further once hit
        }
      }
  
      if (!hit) survivingFruits.push(fruit);
    });
  
    fruits.current = survivingFruits;  // Update AFTER processing all fruits
  };
  

  // Checks if a polygon intersects a line segment defined by p1 and p2
  const polygonIntersectsLine = (polygon, p1, p2) => {
    for (let i = 0; i < polygon.length; i++) {
      let pA = polygon[i];
      let pB = polygon[(i + 1) % polygon.length];
      if (lineIntersectsLine(p1, p2, pA, pB)) return true;
    }
    return false;
  };

  // Checks if two line segments (A-B and C-D) intersect
  const lineIntersectsLine = (A, B, C, D) => {
    const det = (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x);
    if (det === 0) return false; // Parallel lines
    const lambda = ((D.y - C.y) * (D.x - A.x) + (C.x - D.x) * (D.y - A.y)) / det;
    const gamma = ((A.y - B.y) * (D.x - A.x) + (B.x - A.x) * (D.y - A.y)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  };

  
  const handleTryAgain = () => {
    setScore(0);
    setLives(3);
    setGameOver(false); // This will trigger the interval via the useEffect above

    fruits.current = [];
    juiceEffects.current = [];
    handPath.current = [];
    fruitsStartedRef.current = false;

    setTimeout(() => {
      fruitsStartedRef.current = true;
    }, 4000);
  };


  
  return (
    <>
    
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* --- BLURRED MARGIN PANELS --- */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "clamp(30px, 8vw, 100px)",
          height: "100%",
          zIndex: 1001,
          // translucent background + actual blur of what's behind
          background: "rgba(255,255,255,0.2)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "clamp(30px, 8vw, 100px)",
          height: "100%",
          zIndex: 1001,
          background: "rgba(255,255,255,0.2)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />
      {/* Score Display (Adjusted to avoid overlap) */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "20px",
          fontWeight: "bold",
          background: "rgba(255, 255, 255, 0.8)",
          padding: "10px 20px",
          borderRadius: "10px",
          zIndex: 1002, // Ensures it's above other elements
        }}
      >
        Score: {score}
      </div>
    
      {/* Game Canvas */}
      <canvas ref={canvasRef} className="draw" style={{ display: "block" }}></canvas>
      <canvas ref={handCanvasRef} className="hand" style={{ position: "absolute", top: 0, left: 0 }}></canvas>

      {/* Lives Display */}
      <div
        style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 1002,
            fontSize: "28px",
            background: "rgba(255,255,255,0.5)",
            padding: "5px 10px",
            borderRadius: "8px",
            color: "#e53935",
        }}
        >
        {Array.from({ length: lives }).map((_, i) => (
            <span key={i}>❤️</span>
        ))}
        </div>

      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1002,
          fontSize: "24px",
        }}
      >

        {/* GAME OVER OVERLAY */}
        {gameOver && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              color: "#fff",
            }}
          >
            <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>Game Over</h1>
            <p style={{ fontSize: "2rem", marginBottom: "2rem" }}>Your Score: {score}</p>
            <button
              onClick={handleTryAgain}
              style={{
                padding: "15px 40px",
                fontSize: "1.5rem",
                borderRadius: "10px",
                border: "none",
                background: "#ff9800",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
</>


  );
}

export default Fruit;
