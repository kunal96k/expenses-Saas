import React from 'react';

const NotificationsPage = () => {
  const notifications = [
    { id: 1, title: 'New Intern Joined', text: 'Priya patil joined Software Development team', time: '2 hours ago', icon: 'bi-person-plus', color: 'bg-blue-soft text-blue' },
    { id: 2, title: 'Task Completed', text: 'Project documentation has been completed', time: '5 hours ago', icon: 'bi-check-circle', color: 'bg-green-soft text-green' },
    { id: 3, title: 'Pending Review', text: '3 intern applications need your review', time: '1 day ago', icon: 'bi-exclamation-triangle', color: 'bg-orange-soft text-orange' },
    { id: 4, title: 'System Update', text: 'New features have been added to the dashboard', time: '2 days ago', icon: 'bi-bell', color: 'bg-purple-soft text-purple' },
  ];

  return (
    <div className="notifications-page">
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {notifications.map(notification => (
          <div className="d-flex gap-3 p-3 border-bottom notification-item" key={notification.id}>
            <div className={`activity-icon ${notification.color}`}>
              <i className={`bi ${notification.icon}`}></i>
            </div>
            <div className="flex-grow-1">
              <p className="mb-1"><strong>{notification.title}</strong></p>
              <small className="text-muted">{notification.text}</small>
              <div><small className="text-muted">{notification.time}</small></div>
            </div>
            <button className="btn btn-sm btn-light h-100">
              <i className="bi bi-x"></i>
            </button>
          </div>
        ))}
      </div>
      <div className="modal-footer px-0 pb-0 mt-3">
        <button type="button" className="btn btn-light" data-bs-dismiss="modal">Close</button>
        <button type="button" className="btn btn-primary-custom">Mark All as Read</button>
      </div>
    </div>
  );
};

export default NotificationsPage;
