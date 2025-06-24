// QuizPlayer.jsx
import React, { useState, useEffect } from "react";
import "./QuizPlayer.css";

export default function QuizPlayer({ quizUrl }) {
  const [quizData, setQuizData] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [quizOver, setQuizOver] = useState(false);

  useEffect(() => {
    fetch(quizUrl)
      .then(res => res.json())
      .then(setQuizData);
  }, [quizUrl]);

  const handleSubmit = () => {
    if (selected !== null) setSubmitted(true);
  };

  const handleNext = () => {
    if (index + 1 < quizData.length) {
      setIndex(i => i + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setQuizOver(true);
    }
  };

  if (!quizData) return <p>Loading quiz...</p>;
  if (quizOver) return <h2>Quiz Over!</h2>;

  const q = quizData[index];

  return (
    <div className="quiz-container">
      <h2>Q{index + 1}: {q.question}</h2>
      <ul className="options">
        {q.options.map((opt, i) => {
          let className = "";
          if (submitted) {
            if (opt === q.answer) className = "correct";
            else if (opt === selected) className = "wrong";
            else className = "faded";
          } else if (selected === opt) {
            className = "selected";
          }
          return (
            <li key={i} className={`option ${className}`} onClick={() => !submitted && setSelected(opt)}>
              {opt}
            </li>
          );
        })}
      </ul>
      {!submitted ? (
        <button disabled={selected === null} onClick={handleSubmit}>Submit</button>
      ) : (
        <>
          <p><strong>Explanation:</strong> {q.explanation}</p>
          <button onClick={handleNext}>{index + 1 === quizData.length ? "Finish" : "Next"}</button>
        </>
      )}
    </div>
  );
}
