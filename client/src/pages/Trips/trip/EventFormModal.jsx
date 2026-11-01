import React from "react";
import dayjs from "dayjs";
import Modal from "../../../components/Modal/Modal";
import DatePicker from "../../../components/DatePicker/DatePicker";
import TimePicker from "../../../components/TimePicker/TimePicker";

// Create or edit an event. `event` is the form's { title, date, startTime, endTime }.
const EventFormModal = ({ open, onClose, isEditing, event, onChange, trip, errorMessage, onSubmit, onRequestDelete }) => (
  <Modal open={open} onClose={onClose} title={isEditing ? "Edit event" : "Add event"} className="overflow-visible">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="event-title" className="field-label">
                Event
              </label>
              <input
                id="event-title"
                type="text"
                className="field"
                placeholder="Dinner at the harbour"
                value={event.title}
                onChange={(e) => onChange({ ...event, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="event-date" className="field-label">
                Date
              </label>
              <DatePicker
                id="event-date"
                value={event.date}
                min={trip.startDate ? dayjs(trip.startDate).format("YYYY-MM-DD") : undefined}
                max={trip.endDate ? dayjs(trip.endDate).format("YYYY-MM-DD") : undefined}
                onChange={(date) => onChange({ ...event, date })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="event-start" className="field-label">
                  Starts
                </label>
                <TimePicker
                  id="event-start"
                  value={event.startTime}
                  onChange={(startTime) => onChange({ ...event, startTime })}
                />
              </div>
              <div>
                <label htmlFor="event-end" className="field-label">
                  Ends
                </label>
                <TimePicker
                  id="event-end"
                  value={event.endTime}
                  onChange={(endTime) => onChange({ ...event, endTime })}
                />
              </div>
            </div>
  
            {errorMessage && (
              <p role="alert" className="text-sm font-bold text-red-700">
                {errorMessage}
              </p>
            )}
  
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {isEditing && (
                <button
                  type="button"
                  className="mr-auto border-0 bg-transparent p-0 text-sm font-extrabold text-plum underline hover:text-plum"
                  onClick={onRequestDelete}
                >
                  Delete event
                </button>
              )}
              <button type="button" className="btn-ghost ml-auto" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {isEditing ? "Save changes" : "Add event"}
              </button>
            </div>
          </form>
        </Modal>
);

export default EventFormModal;
