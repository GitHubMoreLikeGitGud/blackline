export function ConfigNotice({ missing }: { missing: readonly string[] }) {
  return (
    <section className="notice" aria-labelledby="config-title">
      <h2 id="config-title">Add your Firebase config</h2>
      <p>
        Blackline is running with placeholder config, so it will not call a model and it will not crash.
        Copy <code>.env.example</code> to <code>.env.local</code>, replace every value, and reload.
        Placeholders such as <code>your-api-key</code> stay in this state on purpose.
      </p>
      <ul>
        {missing.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}
