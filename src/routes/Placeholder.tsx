/* Generic stub for screens not yet built. Each phase replaces the relevant
 * route with its real implementation. */
export default function Placeholder({ name, phase }: { name: string; phase: string }) {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20 }}>{name}</h1>
      <p style={{ color: '#666' }}>Coming in {phase}.</p>
    </div>
  );
}
