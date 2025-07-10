import {
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatClient } from '@azure/communication-chat';
import {
  AzureCommunicationTokenCredential,
  CommunicationUserIdentifier,
  MicrosoftTeamsUserIdentifier,
} from '@azure/communication-common';
import {
  CallComposite,
  ChatComposite,
  fromFlatCommunicationIdentifier,
  useAzureCommunicationChatAdapter,
  useTeamsCallAdapter,
  TeamsCallAdapterArgs
} from '@azure/communication-react';
import config from "./lib/config";
const ENDPOINT_URL = config.acsEndpoint

const containerStyle: CSSProperties = {
  border: 'solid 0.125rem olive',
  margin: '0.5rem',
  width: '50vw',
};

export function Voice(props: { displayName: string | undefined, objectId: string | undefined, cToken: string | undefined, newUserId?: string, newUserToken?: string }) {

  const chatArgs = useAzureCommunicationServiceArgs(props.displayName ?? "", ENDPOINT_URL ?? "", props.newUserId ?? "", props.newUserToken ?? "");
  const [callState, setCallState] = useState<string | undefined>(undefined)
  const teamsUserId: MicrosoftTeamsUserIdentifier = useMemo(
    () => {
      return {
        microsoftTeamsUserId: props.objectId ?? "",
        isAnonymous: false,
        cloud: "public"
      }
    },
    [props.objectId]
  );

  const callAdapterArgs: TeamsCallAdapterArgs = useMemo(
    () => {
      return ({
        userId: teamsUserId,
        credential: new AzureCommunicationTokenCredential(props.cToken ?? ""),
        locator: {
          meetingLink: ""
        }
      })
    },
    [teamsUserId.microsoftTeamsUserId, props.cToken]
  );
  const callAdapterArgsWithTeams = useTeamsCallAdapter(callAdapterArgs)

  useEffect(() => {
      callAdapterArgsWithTeams?.onStateChange((e) => {
      setCallState((prev) => {
        if (prev !== e.call?.state) {
          console.log('State Changed from ', prev, ' to ', e.call?.state);
          return e.call?.state;
        }
        return prev;
      })
  });
  }, [callAdapterArgsWithTeams])

  const chatAdapterArgs = useMemo(
    () => ({
      endpoint: ENDPOINT_URL,
      userId: fromFlatCommunicationIdentifier(
         chatArgs.acsUserId
       ) as CommunicationUserIdentifier,
      displayName: props.displayName,
      credential: new AzureCommunicationTokenCredential(chatArgs.acsUserToken),
      threadId: chatArgs.threadId,
    }),
    [ENDPOINT_URL, chatArgs.acsUserId, chatArgs.acsUserToken, chatArgs.threadId]
  );

  const chatAdapter = useAzureCommunicationChatAdapter(chatAdapterArgs);

  if (!!callAdapterArgsWithTeams && !!chatAdapter) {
    return (
      <div>
        <div style={{ height: '100vh', display: 'flex' }}>
          <div style={containerStyle}>
            <ChatComposite adapter={chatAdapter} options={{richTextEditor: true}} />
          </div>
          <div style={containerStyle}>
            <CallComposite adapter={callAdapterArgsWithTeams} />
          </div>
        </div>
      </div>

    );
  }
  if (callAdapterArgs.credential === undefined) {
    return (
      <h3>Failed to construct credential. Provided token is malformed.</h3>
    );
  }
  return <h3>Initializing...</h3>;
};

function useAzureCommunicationServiceArgs(displayName: string, endpoint: string, userId: string, token: string): {
  endpointUrl: string;
  acsUserId: string;
  acsUserToken: string;
  displayName: string;
  groupId: string;
  threadId: string;
} {
  const [threadId, setThreadId] = useState('');
  useEffect(() => {
    (async () => {
      const client = new ChatClient(
        endpoint,
        new AzureCommunicationTokenCredential(token)
      );
      const { chatThread } = await client.createChatThread(
        {
          topic: 'Composites Demo App',
        },
        {
          participants: [
            {
              id: fromFlatCommunicationIdentifier(userId),
              displayName: displayName
            },
          ],
        }
      );
      setThreadId(chatThread?.id ?? '');
    })();
  }, [displayName, endpoint, userId, token]);

  // The group Id must be a UUID.
  const groupId = useRef(uuidv4());

  return {
    endpointUrl: endpoint,
    acsUserId: userId,
    acsUserToken: token,
    displayName: displayName,
    groupId: groupId.current,
    threadId,
  };
}
