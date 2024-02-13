const { AuthClient, CacheClient, CacheGet, CredentialProvider, ExpiresIn, GenerateDisposableToken } = require('@gomomento/sdk');
let authClient;
let cacheClient;

export default async function handler(req, res) {
  try {
    await initializeMomento();

    const username = req.query.user;
    const cacheResponse = await cacheClient.get(process.env.NEXT_PUBLIC_cacheName, `${username}-token`);
    if (cacheResponse instanceof CacheGet.Hit) {
      res.status(200).json({ token: cacheResponse.valueString() });
    } else {
      const tokenScope = {
        permissions: [
          {
            role: 'publishsubscribe',
            cache: process.env.NEXT_PUBLIC_cacheName,
            topic: process.env.NEXT_PUBLIC_topicName
          },
          {
            role: 'readonly',
            cache: process.env.NEXT_PUBLIC_cacheName,
            item: {
              key: 'players'
            }
          }
        ]
      };

      const token = await authClient.generateDisposableToken(tokenScope, ExpiresIn.hours(1), { tokenId: username });
      if (token instanceof GenerateDisposableToken.Success) {

        await cacheClient.set(process.env.NEXT_PUBLIC_cacheName, `${username}-token`, token.authToken);
        res.status(200).json({ token: token.authToken });
      } else {
        throw new Error('Unable to create auth token');
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

const initializeMomento = async () => {
  if (cacheClient && authClient) {
    return;
  }

  cacheClient = new CacheClient({
    credentialProvider: CredentialProvider.fromEnvVar('MOMENTO_AUTH'),
    defaultTtlSeconds: 3300
  });

  authClient = new AuthClient({
    credentialProvider: CredentialProvider.fromEnvVar('MOMENTO_AUTH')
  });
};
