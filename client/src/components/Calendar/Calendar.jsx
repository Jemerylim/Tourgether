import React, { useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const CalendarComponent = ({ initialEvents = [], onEventAdd, onDatesChange }) => {
    const [events, setEvents] = useState(initialEvents);

    const handleSelectSlot = (slotInfo) => {
        const selectedDate = slotInfo.start;
        const today = new Date();
        if (selectedDate < today.setHours(0, 0, 0, 0)) {
            return; // Prevent past date selection
        }

        // Check if the date is already selected
        const isAlreadySelected = events.some(
            (event) => event.start.toDateString() === selectedDate.toDateString()
        );

        let updatedEvents;

        if (isAlreadySelected) {
            // Remove the event if it's already selected
            updatedEvents = events.filter(
                (event) => event.start.toDateString() !== selectedDate.toDateString()
            );
        } else {
            // Add a new event
            const newEvent = {
                title: "Available",
                start: selectedDate,
                end: selectedDate,
                allDay: true,
            };
            updatedEvents = [...events, newEvent];
            if (onEventAdd) onEventAdd(newEvent); // Notify parent about the new event
        }

        setEvents(updatedEvents);
        if (onDatesChange) onDatesChange(updatedEvents); // Notify parent about updated events
    };

    const dayPropGetter = (date) => {
        const today = new Date();
        if (date < today.setHours(0, 0, 0, 0)) {
            return {
                style: {
                    backgroundColor: "#f5f5f5", // Light gray background
                    pointerEvents: "none", // Disable interaction
                    color: "#ccc", // Optional: Light text color
                },
            };
        }
        return {};
    };

    return (
        <div style={{ width: "90%", maxWidth: "1200px", margin: "0 auto", height: "500px" }}>
            <style>
                {`
                    .rbc-toolbar {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 10px;
                    }

                    .rbc-toolbar-label {
                        font-size: 1.5rem;
                        font-weight: bold;
                        text-align: center;
                    }

                    .rbc-btn-group {
                        display: flex;
                        justify-content: center;
                        gap: 10px;
                    }
                `}
            </style>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                selectable
                onSelectSlot={handleSelectSlot} // Handle single selection
                defaultView="month"
                views={["month"]}
                min={new Date()} // Block dates before today
                dayPropGetter={dayPropGetter}
                style={{ width: "100%", height: "100%" }}
                longPressThreshold={9999} // Effectively disable drag
                popup={false} // Disable event popups if needed
            />
        </div>
    );
};

export default CalendarComponent;
