import React from 'react';
import './Pagination.css';

const Pagination = ({ 
    totalItems, 
    itemsPerPage, 
    currentPage, 
    onPageChange, 
    onItemsPerPageChange 
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalItems === 0) return null;

    return (
        <div className="pagination-wrapper">
            <div className="pagination-left">
                <span>Show</span>
                <select 
                    className="form-select form-select-sm entries-select" 
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                </select>
                <span>entries</span>
            </div>

            <div className="pagination-right">
                <div className="pagination-info me-3">
                    Showing {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                </div>
                <div className="pagination-controls-group">
                    <button 
                        className="page-btn-nav" 
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                    >
                        Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Basic logic to show limited page numbers if there are too many
                        if (totalPages > 7) {
                            if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                return (
                                    <button 
                                        key={i} 
                                        className={`page-btn-num ${currentPage === pageNum ? 'active' : ''}`}
                                        onClick={() => onPageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                return <span key={i} className="px-2">...</span>;
                            }
                            return null;
                        }
                        
                        return (
                            <button 
                                key={i} 
                                className={`page-btn-num ${currentPage === pageNum ? 'active' : ''}`}
                                onClick={() => onPageChange(pageNum)}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                    <button 
                        className="page-btn-nav" 
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
