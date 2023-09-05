import React, { useEffect, useRef } from "react";
import Avatar from "./avatar";

import {
  MessageGroup
} from 'janus-ds';


export default function Conversation({ data, auth, users }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.scrollTo(0, ref.current.scrollHeight);
  }, [data]);

  const directionForMessage = (messageUserId) => {
    return messageUserId === auth.id ? 'outgoing' : 'incoming';
  };

  const avatarTextForMessage = (messageUserId) => {
    return users[messageUserId]?.name?.slice(0, 2) || "NA";
  };

  const messageGroups = [];
  let currentGroup = null;

  data.forEach((message) => {
    const direction = directionForMessage(message.user_id);

    if (currentGroup && currentGroup.direction === direction) {
      currentGroup.messages.push({
        id: `message-${message.id}`,
        children: message.content,
      });
    } else {
      currentGroup = {
        direction,
        messages: [
          {
            id: `message-${message.id}`,
            children: message.content,
          },
        ],
      };
      if (direction === 'incoming') {
        currentGroup.avatarText = avatarTextForMessage(message.user_id);
      }
      messageGroups.push(currentGroup);
    }
  });

  return (
    <div ref={ref}>
      {messageGroups.map((group, index) => (
        <MessageGroup
          key={index}
          direction={group.direction}
          messages={group.messages}
          avatarText={group.direction === 'incoming' ? group.avatarText : undefined}
        />
      ))}
    </div>
  );
}
