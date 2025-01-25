import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Quiz.css";
import Navbar from "../../components/Navbar/Navbar";

const Quiz = () => {
    const [currentQuestion, setCurrentQuestion] = useState(-1); // Default to intro page
    const [selectedOption, setSelectedOption] = useState(null);
    const navigate = useNavigate();

    const questions = [
        {
            question: "What’s your ideal travel pace?",
            options: [
                "Relaxed and easygoing, with plenty of downtime",
                "Balanced: Some activities, but time to unwind too",
                "Packed with activities from morning till night",
                "I like a mix depending on the destination"
            ],
        },
        {
            question: "What’s your preferred type of accommodation?",
            options: [
                "Budget-friendly hostels or shared accommodations",
                "Mid-range hotels or cozy Airbnbs",
                "Luxury hotels or resorts with all amenities",
                "Camping or glamping in nature"
            ],
        },
        // Add more questions as needed
    ];


    const handleNext = () => {
        if (selectedOption === null) {
            alert("Please select an option before proceeding.");
            return;
        }
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedOption(null);
        } else {
            navigate("/result", { state: { selectedOptions: selectedOption } }); // Redirect to result page with data
        }
    };

    const handleSkip = () => {
        navigate("/home"); // Redirect to home page if the user skips the quiz
    };

    const handleOptionSelect = (option) => {
        setSelectedOption(option);
    };

    return (
        <div className="quiz-page-container">
            {currentQuestion === -1 ? (
                <div className="intro-page">
                    <Navbar />
                    <h2>Discover Your Unique Travel Style</h2>
                    <p>
                        Take a quick personality quiz to find out what type of traveler you are. Your
                        answers will help us personalize your recommendations, itineraries, and tips,
                        making every adventure perfectly suited to you!
                    </p>
                    <div className="intro-buttons">
                        <button className="start-button" onClick={() => setCurrentQuestion(0)}>
                            Start Quiz
                        </button>
                        <button className="skip-button" onClick={handleSkip}>
                            Skip Quiz
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <Navbar />
                    <h2>Discover Your Unique Travel Style</h2>
                    <p>{questions[currentQuestion].question}</p>
                    <div className="options-container">
                        {questions[currentQuestion].options.map((option, index) => (
                            <div
                                key={index}
                                className={`option-card ${selectedOption === option ? "selected" : ""}`}
                                onClick={() => handleOptionSelect(option)}
                            >
                                {option}
                            </div>
                        ))}
                    </div>
                    <button onClick={handleNext} className="next-button">
                        {currentQuestion < questions.length - 1 ? "Next" : "Finish"}
                    </button>
                </>
            )}
        </div>
    );
};

export default Quiz;

export const Result = () => {
    const location = useLocation();
    const navigate = useNavigate(); // Add useNavigate here
    const selectedOption = location.state?.selectedOptions || "";

    // Map selected options to traveler types
    const travelerTypeMap = {
        "Relaxed and easygoing, with plenty of downtime": "Relaxed Traveler",
        "Balanced: Some activities, but time to unwind too": "Balanced Traveler",
        "Packed with activities from morning till night": "Adventurous Traveler",
        "I like a mix depending on the destination": "Flexible Traveler",
        "Budget-friendly hostels or shared accommodations": "Budget Traveler",
        "Mid-range hotels or cozy Airbnbs": "Comfortable Traveler",
        "Luxury hotels or resorts with all amenities": "Luxury Traveler",
        "Camping or glamping in nature": "Nature Lover",
    };

    const travelerType = travelerTypeMap[selectedOption] || "Unique Traveler";

    return (
        <div className="result-page">
            <Navbar />
            <h2>Your Travel Style</h2>
            <p>Based on your answers, you are a...</p>
            <div className="result-container">
                <h3>{travelerType}</h3>
                <p>Enjoy your personalized travel experience!</p>
            </div>
            <button className="home-button" onClick={() => navigate("/")}>
                Go to Home
            </button>
        </div>
    );
};
