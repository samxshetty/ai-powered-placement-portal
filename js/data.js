// js/data.js
(function(){
  // ✅ Initialize data only once
  if (!localStorage.getItem("placementhub_events")) {
    const sampleEvents = [
      { id: "ev1", name: "Google Interview", type: "Interview", date: "2024-11-15", time: "10:00 AM - 11:30 AM", location: "Online", status: "upcoming" },
      { id: "ev2", name: "Microsoft Pre-Placement Talk", type: "PPT", date: "2024-11-18", time: "2:00 PM - 3:30 PM", location: "Auditorium", status: "upcoming" },
      { id: "ev3", name: "Amazon Assessment Test", type: "Test", date: "2024-11-20", time: "9:00 AM - 11:00 AM", location: "Online", status: "upcoming" },
      { id: "ev4", name: "Flipkart Campus Drive", type: "Drive", date: "2024-11-22", time: "10:00 AM - 5:00 PM", location: "Campus", status: "upcoming" },
      { id: "ev5", name: "Adobe Interview", type: "Interview", date: "2024-11-25", time: "3:00 PM - 4:00 PM", location: "Online", status: "upcoming" }
    ];
    localStorage.setItem("placementhub_events", JSON.stringify(sampleEvents));
  }

  // ✅ Shared helpers
  window.PlacementHub = {
    getEvents: function() {
      return JSON.parse(localStorage.getItem("placementhub_events") || "[]");
    },
    saveEvents: function(events) {
      localStorage.setItem("placementhub_events", JSON.stringify(events));
      localStorage.setItem("placementhub_events_updated_at", Date.now());
    },
    getApplications: function(userId) {
      return JSON.parse(localStorage.getItem("applications_" + userId) || "[]");
    },
    saveApplications: function(userId, apps) {
      localStorage.setItem("applications_" + userId, JSON.stringify(apps));
      localStorage.setItem("applications_" + userId + "_updated_at", Date.now());
    },
    getActiveUser: function() {
      return localStorage.getItem("activeUser");
    },
    setActiveUser: function(id) {
      localStorage.setItem("activeUser", id);
    }
  };
})();
