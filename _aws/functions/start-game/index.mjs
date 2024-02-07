import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { TopicClient, CredentialProvider } from '@gomomento/sdk';

let topicClient;
export const handler = async (event) => {
  if (!topicClient) {
    await initializeTopicClient();
  }

  await topicClient.publish(process.env.CACHE_NAME, process.env.TOPIC_NAME, JSON.stringify({ event: 'start-game' }));
};

const initializeTopicClient = async () => {
  const secret = await getSecret(process.env.SECRET_ID, { transform: 'json' });
  topicClient = new TopicClient({
    credentialProvider: CredentialProvider.fromString(secret.momento)
  });
};
