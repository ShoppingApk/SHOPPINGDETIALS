import { lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import Layout from './Layout';
import Spinner from './Spinner';
import NotFound from '../pages/NotFound';

// Downloaded only after an unlock, so normal users never fetch any chat code.
const ChatApp = lazy(() => import('../chat/ChatApp'));

// Route element for /c: the ordinary 404 page unless an unlocked chatuser is logged in.
export default function ChatGate() {
  const { loading } = useAuth();
  const { unlocked } = useChat();

  if (loading) return <Spinner className="py-24" />;
  if (!unlocked) {
    return (
      <Layout>
        <NotFound />
      </Layout>
    );
  }
  return (
    <Suspense fallback={<Spinner className="py-24" />}>
      <ChatApp />
    </Suspense>
  );
}
