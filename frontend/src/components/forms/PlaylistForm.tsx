function PlaylistForm() {
  return (
    <form>
      <div>
        <label htmlFor="distance">Distance</label>
        <input
          id="distance"
          type="number"
          defaultValue={10}
        />
      </div>

      <div>
        <label htmlFor="pace">Pace</label>
        <input
          id="pace"
          type="text"
          defaultValue="5:30"
        />
      </div>

      <div>
        <label htmlFor="genre">Genre</label>
        <select id="genre" defaultValue="rock">
          <option value="rock">Rock</option>
          <option value="pop">Pop</option>
          <option value="edm">EDM</option>
        </select>
      </div>

      <div>
        <label htmlFor="mood">Mood</label>
        <select id="mood" defaultValue="motivation">
          <option value="motivation">Motivation</option>
          <option value="relax">Relax</option>
        </select>
      </div>

      <button type="submit">
        Generate Playlist
      </button>
    </form>
  );
}

export default PlaylistForm;