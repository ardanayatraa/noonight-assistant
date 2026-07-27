import ConsoleShell from '../components/ConsoleShell';

export const dynamic = 'force-dynamic';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
