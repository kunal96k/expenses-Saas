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
    const validTotalItems = Math.max(0, Number(totalItems) || 0);
    const validItemsPerPage = Number(itemsPerPage) || 25;
    const validCurrentPage = Math.max(1, Number(currentPage) || 1);

    const totalPages = Math.max(1, Math.ceil(validTotalItems / validItemsPerPage));

    const from  = validTotalItems === 0 ? 0 : (validCurrentPage - 1) * validItemsPerPage + 1;
    const to    = Math.min(validCurrentPage * validItemsPerPage, validTotalItems);
    const pages = validTotalItems === 0 ? [1] : getPageNumbers(validCurrentPage, totalPages);

    return (
        <div className="pagination-wrapper">

            {/* ── Left: entries selector ── */}
            <div className="pagination-left">
                <span className="pag-label">Show</span>
                <select
                    className="entries-select"
                    value={validItemsPerPage}
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
                    Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{validTotalItems}</strong>
                </span>

                <div className="pagination-controls-group">

                    {/* First page */}
                    <button
                        className="page-btn-nav page-btn-edge"
                        disabled={validCurrentPage === 1 || validTotalItems === 0}
                        onClick={() => onPageChange(1)}
                        title="First page"
                        aria-label="First page"
                    >
                        <i className="bi bi-chevron-double-left"></i>
                    </button>

                    {/* Previous */}
                    <button
                        className="page-btn-nav"
                        disabled={validCurrentPage === 1 || validTotalItems === 0}
                        onClick={() => onPageChange(validCurrentPage - 1)}
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
                                    className={`page-btn-num${validCurrentPage === p && validTotalItems > 0 ? ' active' : ''}`}
                                    disabled={validTotalItems === 0}
                                    onClick={() => onPageChange(p)}
                                    aria-label={`Page ${p}`}
                                    aria-current={validCurrentPage === p && validTotalItems > 0 ? 'page' : undefined}
                                >
                                    {p}
                                </button>
                            )
                    )}

                    {/* Next */}
                    <button
                        className="page-btn-nav"
                        disabled={validCurrentPage >= totalPages || validTotalItems === 0}
                        onClick={() => onPageChange(validCurrentPage + 1)}
                        aria-label="Next page"
                    >
                        <span className="btn-nav-label">Next</span>
                        <i className="bi bi-chevron-right"></i>
                    </button>

                    {/* Last page */}
                    <button
                        className="page-btn-nav page-btn-edge"
                        disabled={validCurrentPage >= totalPages || validTotalItems === 0}
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
