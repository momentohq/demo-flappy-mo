const {  CacheClient, TopicClient, CredentialProvider } = require('@gomomento/sdk');
const { jwtDecode } = require('jwt-decode');

let cacheClient;
let topicClient;

export default async function handler(req, res) {
  try {
    await initializeMomento();

    const { token } = JSON.parse(req.body);
    let data = JSON.parse(Buffer.from(token, 'base64'));
    data = jwtDecode(data.api_key);
    const { id } = data;
    if (req.method === 'DELETE') {
      await cacheClient.setRemoveElement(process.env.NEXT_PUBLIC_cacheName, 'players', id);
    } else if (req.method === 'POST') {
      await cacheClient.setAddElement(process.env.NEXT_PUBLIC_cacheName, 'players', id);
    } else {
      res.status(405).json({ message: 'That method type is not supported' });
      return;
    }

    await topicClient.publish(process.env.NEXT_PUBLIC_cacheName, process.env.NEXT_PUBLIC_topicName, JSON.stringify({ event: 'players-changed'}));
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

const initializeMomento = async () => {
  if (cacheClient && topicClient) {
    return;
  }

  cacheClient = new CacheClient({
    credentialProvider: CredentialProvider.fromEnvVar('MOMENTO_AUTH'),
    defaultTtlSeconds: 3300
  });

  topicClient = new TopicClient({
    credentialProvider: CredentialProvider.fromEnvVar('MOMENTO_AUTH')
  });
};
