import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import * as tf from "@tensorflow/tfjs";
import * as use from "@tensorflow-models/universal-sentence-encoder";
import { PCA } from "ml-pca";

export default function SemanticCube() {
  const mountRef = useRef(null);
  const [model, setModel] = useState(null);
  const [input, setInput] = useState("");
  const [prevInput, setPrevInput] = useState("");

  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const controlsRef = useRef();
  const groupRef = useRef();

  useEffect(() => {
    use.load().then(setModel);
  }, []);

  useEffect(() => {
    const width = 600;
    const height = 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.addEventListener("dblclick", () => {
    camera.zoom *= 1.5;
    camera.updateProjectionMatrix();
    });
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.zoomSpeed = 1.2;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
    };

    // Add visible cube box
    const boxSize = 2;
    const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const wireframe = new THREE.EdgesGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const cubeWireframe = new THREE.LineSegments(wireframe, lineMaterial);
    scene.add(cubeWireframe);
    
    const group = new THREE.Group();
    scene.add(group);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    groupRef.current = group;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  }, []);

  const handleRender = async () => {
    if (!model) return;
    const cleanedInput = input.trim();
    if (cleanedInput === prevInput) return;

    const phrases = cleanedInput
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (phrases.length < 3) {
      alert("Please enter at least 3 words/phrases.");
      return;
    }

    setPrevInput(cleanedInput);

    const embeddings = await model.embed(phrases);
    const vectors = await embeddings.array();
    const pca = new PCA(vectors);
    const reduced = pca.predict(vectors, { nComponents: 3 }).to2DArray();

    const group = groupRef.current;
    while (group.children.length > 0) group.remove(group.children[0]);

    for (let i = 0; i < reduced.length; i++) {
      const [x, y, z] = reduced[i].map(v => v * 0.8); // scale into cube
      const target = new THREE.Vector3(x, y, z);
      const from = target.clone().normalize().multiplyScalar(5); // fly from outside

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xff69b4 })
      );
      sphere.position.copy(from);
      group.add(sphere);
      const texture = new THREE.CanvasTexture(generateTextCanvas(phrases[i]));
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;

      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
        })
      );
      label.scale.set(0.5, 0.25, 1);
      label.position.copy(from);
      group.add(label);

      animateToPosition(sphere, label, target, 0.02);
    }
  };
  const handleZoom = (factor) => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.zoom *= factor;
    camera.updateProjectionMatrix();
    };
  const animateToPosition = (sphere, label, target, speed = 0.02) => {
    let t = 0;
    const start = sphere.position.clone();

    const animate = () => {
      if (t < 1) {
        t += speed;
        const pos = start.clone().lerp(target, t);
        sphere.position.copy(pos);
        label.position.set(pos.x, pos.y + 0.1, pos.z);
        requestAnimationFrame(animate);
      }
    };
    animate();
  };

  const generateTextCanvas = (text) => {
    const fontSize = 64;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    ctx.font = `${fontSize}px Arial`;
    const textWidth = ctx.measureText(text).width;
    canvas.width = textWidth + 40;  // Extra margin
    canvas.height = fontSize + 20;
    ctx.font = `${fontSize}px Arial`;
    ctx.textBaseline = "top";

    // Make background transparent, draw neon-colored text
    ctx.fillStyle = "#00ffff"; // Neon cyan
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 20;
    ctx.fillText(text, 20, 10);

    return canvas;
};


 return (
  <div
    style={{
      position: "relative",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
    }}
  >
    {/* Floating UI */}
    <div
      style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        zIndex: 10,
        background: "rgba(0,0,0,0.5)",
        padding: "10px",
        borderRadius: "8px",
        color: "white",
      }}
    >
      <h2>🧠 Semantic Cube</h2>
      <input
        type="text"
        placeholder="Enter comma-separated words or phrases"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ width: "400px", padding: "5px", marginRight: "10px" }}
      />
      <button onClick={handleRender}>Render</button>
      <div style={{ marginTop: "10px" }}>
        <button onClick={() => handleZoom(1.2)}>➕ Zoom In</button>
        <button onClick={() => handleZoom(1 / 1.2)} style={{ marginLeft: "10px" }}>
            ➖ Zoom Out
        </button>
      </div>
    </div>

    {/* Fullscreen 3D canvas */}
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        zIndex: 0,
      }}
    ></div>
  </div>
);

}
