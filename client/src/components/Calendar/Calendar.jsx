import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./Calendar.css";

const localizer = momentLocalizer(moment);

const CalendarComponent = ({ initialEvents = [], onEventAdd, onDatesChange }) => {
    const [events, setEvents] = useState(() =>
        initialEvents.map((event) => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end),
        }))
    );

    useEffect(() => {
        console.log("Initial events loaded into calendar:", initialEvents);
    }, [initialEvents]);

    const handleSelectSlot = (slotInfo) => {
        const selectedDate = slotInfo.start;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            return; // Prevent past date selection
        }

        const isAlreadySelected = events.some(
            (event) => event.start.toDateString() === selectedDate.toDateString()
        );

        let updatedEvents;

        if (isAlreadySelected) {
            updatedEvents = events.filter(
                (event) => event.start.toDateString() !== selectedDate.toDateString()
            );
        } else {
            const newEvent = {
                title: "Available",
                start: selectedDate,
                end: selectedDate,
                allDay: true,
            };
            updatedEvents = [...events, newEvent];
            if (onEventAdd) onEventAdd(newEvent);
        }

        setEvents(updatedEvents);
        if (onDatesChange) onDatesChange(updatedEvents);
    };

    const renderDayWithCircles = (date) => {
        const dayEvents = events.filter(
            (event) => event.start.toDateString() === date.toDateString()
        );

        console.log("Date:", date, "Day Events:", dayEvents); // Debugging

        return (
            <div className="custom-day-wrapper">
                <div className="custom-day-number">{date.getDate()}</div>
                <div className="availability-circles">
                    {dayEvents.map((event, index) => (
                        <div
                            key={index}
                            className="availability-circle"
                            style={{
                                backgroundColor: getRandomColor(event.id || `default-${index}`),
                            }}
                            title={event.title || "No title available"}
                        ></div>
                    ))}
                </div>
            </div>
        );
    };

    const getRandomColor = (id = "default") => {
        const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colors = [
            "#ff7f7f", "#7f7fff", "#7fff7f", "#ffbf7f", "#7fffbf", "#bf7fff", "#ffff7f",
        ];
        return colors[hash % colors.length];
    };

    return (
        <div style={{ width: "90%", maxWidth: "1200px", margin: "0 auto", height: "500px" }}>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                selectable
                onSelectSlot={handleSelectSlot}
                defaultView="month"
                views={["month"]}
                dayPropGetter={(date) => ({ className: "custom-date-cell" })}
                eventPropGetter={() => ({ style: { display: "none" } })} // Hide default events
                components={{
                    month: {
                        dateHeader: ({ date }) => renderDayWithCircles(date),
                    },
                }}
                style={{ width: "100%", height: "100%" }}
            />
        </div>
    );
};

export default CalendarComponent;
