export default function Pagination({ page, totalPages, total, onPageChange }) {
  return (
    <div className="pagination">
      <button
        className="btn btn-small"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {totalPages} &middot; {total} total records
      </span>
      <button
        className="btn btn-small"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
