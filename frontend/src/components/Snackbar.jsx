import { useSnackbar } from '../context/SnackbarContext';

export function Snackbar() {
  const { snackbars, removeSnackbar } = useSnackbar();

  return (
    <div className="snackbar-container">
      {snackbars.map((snack) => (
        <div
          key={snack.id}
          className={`snackbar snackbar-${snack.type}`}
          onClick={() => removeSnackbar(snack.id)}
        >
          {snack.message}
        </div>
      ))}
    </div>
  );
}