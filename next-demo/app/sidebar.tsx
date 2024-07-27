export const Sidebar = () => {
  return (
    <section className={'is-absolute  has-background-dark'} style={{ width: 300 }}>
      <nav className="panel">
        <p className="panel-heading">GCode preview</p>
        <p className="panel-tabs">
          <a className="is-active">Rendering</a>
          <a>Other</a>
          <a>Settings</a>
        </p>
        <label className="panel-block is-active">
          <input type="checkbox" />
          extrusion
        </label>
        <label className="panel-block">
          <input type="checkbox" />
          travel
        </label>
        <label className="panel-block">
          <input type="checkbox" />
          highlight top layer
        </label>

        <div className="panel-block">
          <button className="button is-link is-outlined is-fullwidth">Reset to defaults</button>
        </div>
      </nav>
    </section>
  );
};
