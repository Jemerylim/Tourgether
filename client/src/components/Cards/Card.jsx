import React from "react";
import "./Card.css";

const Card = ({ title, content, imageUrl, onClick }) => {
  return (
    <div className="card-container" onClick={onClick}>
      {imageUrl && <img src={imageUrl} alt={title} className="card-image" />}
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-description">{content}</p>
      </div>
    </div>
  );
};

export default Card;
