import React from 'react';

const ActivityFeed = () => {
  const activities = [
    { id: 1, user: "Priya patil", action: "joined Software Development team", time: "2 hours ago", icon: "bi-person-plus", color: "bg-blue-soft text-blue" },
    { id: 2, user: "kunal Verma", action: "completed onboarding", time: "5 hours ago", icon: "bi-check-circle", color: "bg-green-soft text-green" },
    { id: 3, user: "Amit Patel", action: "submitted project report", time: "1 day ago", icon: "bi-file-text", color: "bg-orange-soft text-orange" },
    { id: 4, user: "Sneha Reddy", action: "received certification", time: "2 days ago", icon: "bi-award", color: "bg-purple-soft text-purple" },
  ];

  return (
    <div className="card chart-card h-100">
      <div className="card-header-custom">
        <h5>Recent Activity</h5>
      </div>
      <div className="card-body">
        {activities.map(activity => (
          <div className="activity-item" key={activity.id}>
            <div className={`activity-icon ${activity.color}`}>
              <i className={`bi ${activity.icon}`}></i>
            </div>
            <div className="activity-content">
              <p><strong>{activity.user}</strong> {activity.action}</p>
              <span className="activity-time">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
