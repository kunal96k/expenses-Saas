import React from 'react';
import './Pagination.css';

/**
 * getPageNumbers — returns an array of page numbers + '...' separators.
 * Always shows: first, up to 2 pages around current, last.
 * Example (current=5, total=12): [1, '...', 4, 5, 6, '...', 12]
 */
const getPageNumbers = (current, total) => {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = [];
    const delta = 1; // pages on each side of current

    const left  = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    // Always include page 1
    pages.push(1);

    // Left ellipsis
    if (left > 2) pages.push('...');

    // Window around current page
    for (let p = left; p <= right; p++) pages.push(p);

    // Right ellipsis
    if (right < total - 1) pages.push('...');

    // Always include last page
    pages.push(total);

    return pages;
};

const Pagination = ({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    onItemsPerPageChange,
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalItems === 0) return null;

    const from  = (currentPage - 1) * itemsPerPage + 1;
    const to    = Math.min(currentPage * itemsPerPage, totalItems);
    const pages = getPageNumbers(currentPage, totalPages);

    return (
        <div className="pagination-wrapper">

            {/* ── Left: entries selector ── */}
            <div className="pagination-left">
                <span className="pag-label">Show</span>
                <select
                    className="entries-select"
                    value={itemsPerPage}
                    onChange={e => onItemsPerPageChange(Number(e.target.value))}
                    aria-label="Entries per page"
                >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                </select>
                <span className="pag-label">entries</span>
            </div>

            {/* ── Right: info + page controls ── */}
            <div className="pagination-right">

                {/* Showing X to Y of Z */}
                <span className="pagination-info">
                    Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{totalItems}</strong>
                </span>

                <div className="pagination-controls-group">

                    {/* First page */}
                    <button
                        className="page-btn-nav page-btn-edge"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(1)}
                        title="First page"
                        aria-label="First page"
                    >
                        <i className="bi bi-chevron-double-left"></i>
                    </button>

                    {/* Previous */}
                    <button
                        className="page-btn-nav"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                        aria-label="Previous page"
                    >
                        <i className="bi bi-chevron-left"></i>
                        <span className="btn-nav-label">Prev</span>
                    </button>

                    {/* Page numbers */}
                    {pages.map((p, idx) =>
                        p === '...'
                            ? (
                                <span key={`ellipsis-${idx}`} className="page-ellipsis">
                                    &hellip;
                                </span>
                            )
                            : (
                                <button
                                    key={p}
                                    className={`page-btn-num${currentPage === p ? ' active' : ''}`}
                                    onClick={() => onPageChange(p)}
                                    aria-label={`Page ${p}`}
                                    aria-current={currentPage === p ? 'page' : undefined}
                                >
                                    {p}
                                </button>
                            )
                    )}

                    {/* Next */}
                    <button
                        className="page-btn-nav"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                        aria-label="Next page"
                    >
                        <span className="btn-nav-label">Next</span>
                        <i className="bi bi-chevron-right"></i>
                    </button>

                    {/* Last page */}
                    <button
                        className="page-btn-nav page-btn-edge"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(totalPages)}
                        title="Last page"
                        aria-label="Last page"
                    >
                        <i className="bi bi-chevron-double-right"></i>
                    </button>

                </div>
            </div>
        </div>
    );
};

export default Pagination;
