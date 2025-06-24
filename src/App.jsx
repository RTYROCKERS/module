import React, { useState } from "react";
import "./App.css";
import QuizPlayer from "./QuizPlayer";
import Fruit from "./Fruit";
import Lander from "./Lunar";
import SemanticCube from "./Visual";
import DoodleClassifier from "./Draw";

const modules = [
  {
    title: "Computer Understanding Images",
    links: {
      document: import.meta.env.VITE_M1_DOC1,
      quiz: import.meta.env.VITE_M1_QUIZ1,
      game: "drawing-game"
    }
  },
  {
    title: "Gesture Recognization",
    links: {
      document: import.meta.env.VITE_M2_DOC1,
      quiz: import.meta.env.VITE_M2_QUIZ1,
      game: "Fruit"
    }
  },
  {
    title: "Spaceship Landing",
    links: {
      document: import.meta.env.VITE_M3_DOC1,
      quiz: import.meta.env.VITE_M3_QUIZ1,
      game: "Lunar"
    }
  },
  {
    title: "Word Visualizer",
    links: {
      document: import.meta.env.VITE_M4_DOC1,
      quiz: import.meta.env.VITE_M4_QUIZ1,
      game: "Visual"
    }
  }
];

const IframeView = ({ url }) => (
  <iframe
    src={url}
    title="External content"
    className="content-iframe"
    allowFullScreen
  />
);

const Sidebar = ({ modules, onSelect }) => (
  <div className="sidebar">
    {modules.map((module, idx) => (
      <div key={idx} className="module-card">
        <h2>{module.title}</h2>
        <button onClick={() => onSelect(module.links.document)}>View Document</button>
        <button onClick={() => onSelect(module.links.quiz)}>Take Quiz</button>
        <button onClick={() => onSelect(module.links.game)}>Play Game</button>
      </div>
    ))}
  </div>
);

export default function App() {
  const [view, setView] = useState(null);

  const renderView = () => {
    if (!view) return <div className="placeholder">Select a module to begin</div>;
    if (view === "drawing-game") return <DoodleClassifier />;
    if (view.endsWith(".json")) return <QuizPlayer quizUrl={view} />;
    if (view === "Fruit") return <Fruit />;
    if (view === "Lunar") return <Lander />;
    if (view === "Visual") return <SemanticCube />;
    return <IframeView url={view} />;
  };

  return (
    <div className="app-container">
      <div className="container">
        <Sidebar modules={modules} onSelect={setView} />
        <div className="content-area">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
