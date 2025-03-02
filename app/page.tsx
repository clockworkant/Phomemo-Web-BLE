import PrinterConnect from '../components/PrinterConnect';

export default function Home() {
  return (
    <main style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1rem'
    }}>
      <h1 style={{ 
        fontSize: '2rem',
        fontWeight: 'bold',
        marginBottom: '2rem',
        color: 'var(--text-color)'
      }}>
        T02 Printer Connection
      </h1>
      <PrinterConnect />
    </main>
  );
}
