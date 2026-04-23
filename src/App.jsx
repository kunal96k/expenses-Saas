import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import DashboardView from './views/DashboardView';
import EmptyView from './views/EmptyView';
import AddInternModal from './modals/AddInternModal';
import ProfileModal from './modals/ProfileModal';
import SettingsModal from './modals/SettingsModal';
import NotificationsModal from './modals/NotificationsModal';
import Swal from 'sweetalert2';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarShown, setIsSidebarShown] = useState(false);
  const [interns, setInterns] = useState([
    { id: 1, name: "Priya patil", dept: "Development", date: "Oct 24, 2024", status: "active" },
    { id: 2, name: "kunal Verma", dept: "Design", date: "Oct 22, 2024", status: "active" },
    { id: 3, name: "Amit Patel", dept: "Marketing", date: "Oct 20, 2024", status: "pending" },
    { id: 4, name: "Sneha Reddy", dept: "Finance", date: "Oct 18, 2024", status: "inactive" },
    { id: 5, name: "Vikram Singh", dept: "Development", date: "Oct 15, 2024", status: "active" }
  ]);

  const toggleSidebar = () => {
    if (window.innerWidth >= 992) {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    } else {
      setIsSidebarShown(!isSidebarShown);
    }
  };

  const handlePageChange = (pageId) => {
    setActivePage(pageId);
    if (window.innerWidth < 992) {
      setIsSidebarShown(false);
    }
  };

  const addIntern = (newIntern) => {
    setInterns([{
      ...newIntern,
      id: interns.length + 1,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }, ...interns]);
    
    Swal.fire({
      icon: 'success',
      title: 'Saved!',
      text: 'New intern added successfully.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const deleteIntern = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'Delete'
    }).then((result) => {
      if (result.isConfirmed) {
        setInterns(interns.filter(i => i.id !== id));
        Swal.fire('Deleted!', 'User has been removed.', 'success');
      }
    });
  };

  const editIntern = (id) => {
    const modal = new bootstrap.Modal(document.getElementById('addModal'));
    modal.show();
  };

  return (
    <div className="app-container d-flex">
      <Sidebar 
        activePage={activePage} 
        onPageChange={handlePageChange} 
        isCollapsed={isSidebarCollapsed}
        isShown={isSidebarShown}
        setIsSidebarShown={setIsSidebarShown}
      />
      
      {/* Sidebar overlay for mobile - Always rendered for smooth CSS transition */}
      <div 
        className={`sidebar-overlay ${isSidebarShown ? 'show' : ''}`} 
        onClick={() => setIsSidebarShown(false)}
      ></div>
      
      <div className={`main-wrapper d-flex flex-column flex-grow-1 ${isSidebarCollapsed ? 'expanded' : ''}`} id="mainWrapper">
        <Header 
          activePage={activePage} 
          toggleSidebar={toggleSidebar} 
        />
        
        <main className="content-area flex-grow-1">
          {activePage === 'dashboard' ? (
            <DashboardView 
              interns={interns} 
              onDelete={deleteIntern} 
              onEdit={editIntern} 
            />
          ) : (
            <EmptyView pageId={activePage} />
          )}
        </main>

        <Footer />
      </div>

      <AddInternModal onSave={addIntern} />
      <ProfileModal />
      <SettingsModal />
      <NotificationsModal />
    </div>
  );
}

export default App;
