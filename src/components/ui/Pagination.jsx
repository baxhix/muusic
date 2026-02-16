import Button from './Button';

export default function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="mt-5 flex items-center justify-end gap-3">
      <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        Anterior
      </Button>
      <span className="text-sm text-muted-foreground">Pagina {page} de {totalPages}</span>
      <Button variant="secondary" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        Proxima
      </Button>
    </div>
  );
}
