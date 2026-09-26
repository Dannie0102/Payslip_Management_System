import "./NotFound.css";

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-card">

        <div className="not-found-icon">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>

        <h1>404</h1>

        <h2>Page Not Found</h2>

        <p>
          Sorry, the page you are looking for
          does not exist or may have been moved.
        </p>

        <button
          type="button"
          onClick={() => window.history.back()}
          className="not-found-button"
        >
          <i className="fa-solid fa-arrow-left"></i>
          Go Back
        </button>

      </div>
    </div>
  );
};

export default NotFound;