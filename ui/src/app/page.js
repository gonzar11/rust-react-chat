'use client';
import Head from 'next/head';
import React, { useEffect, useState } from 'react';
import Avatar from '../../components/avatar';
import ChatList from '../../components/rooms';
import Conversation from '../../components/conversation';
import Login from '../../components/login';
import useConversations from '../../libs/useConversation';
import useLocalStorage from '../../libs/useLocalStorage';
import useWebsocket from '../../libs/useWebsocket';

import {
  SidebarContainer,
  Container,
  Search,
  Spacer,
  NewMessageButton,
  SidebarList,
  HeaderContainer,
  Header,
  MessageInput,
  MessageGroup,
  MainContainer,
  MessagesContainer,
  MessageInputContainer,
} from 'janus-ds';

async function getRooms() {
  try {
    const url = 'http://localhost:8080/rooms';
    let result = await fetch(url);
    return result.json();
  } catch (e) {
    console.log(e);
    return Promise.resolve(null);
  }
}

export default function Home() {
  const [room, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [typingStatus, setTypingStatus] = useState({});
  const [showLogIn, setShowLogIn] = useState(false);
  const [auth, setAuthUser] = useLocalStorage('user', false);
  const [isLoading, messages, setMessages, fetchConversations] =
    useConversations('');

  const handleTyping = (mode, roomId) => {
    setTypingStatus((prevStatus) => ({
      ...prevStatus,
      [roomId]: mode === 'IN',
    }));

    setRooms((prevData) => {
      return prevData.map((item) => {
        if (item.room.id === roomId) {
          return { ...item, room: { ...item.room, isTyping: mode === 'IN' } };
        }
        return item;
      });
    });
  };

  const handleMessage = (msg, userId) => {
    setMessages((prev) => {
      const item = { content: msg, user_id: userId };
      return [...prev, item];
    });
  };

  const onMessage = (data) => {
    try {
      let messageData = JSON.parse(data);
      console.log('on message', messageData.chat_type);
      switch (messageData.chat_type) {
        case 'TYPING': {
          console.log('value of typing', messageData.value[0]);
          handleTyping(messageData.value[0], messageData.room_id);
          return;
        }
        case 'TEXT': {
          handleMessage(messageData.value[0], messageData.user_id);
          return;
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const updateFocus = () => {
    const data = {
      id: 0,
      chat_type: 'TYPING',
      value: ['IN'],
      room_id: room.id,
      user_id: auth.id,
    };
    sendMessage(JSON.stringify(data));
  };

  const onFocusChange = () => {
    const data = {
      id: 0,
      chat_type: 'TYPING',
      value: ['OUT'],
      room_id: room.id,
      user_id: auth.id,
    };
    sendMessage(JSON.stringify(data));
  };

  const submitMessage = (e) => {
    let message;

    if (e && e.preventDefault) {
      e.preventDefault();
      message = e.target.message.value;
    } else {
      message = e;
    }

    if (message === '') {
      return;
    }

    if (!room.id) {
      alert('Please select chat room!');
      return;
    }

    const data = {
      id: 0,
      chat_type: 'TEXT',
      value: [message],
      room_id: room.id,
      user_id: auth.id,
    };

    sendMessage(JSON.stringify(data));
    handleMessage(message, auth.id);
    onFocusChange();
  };

  const sendMessage = useWebsocket(onMessage);
  const updateMessages = (data) => {
    if (!data.id) return;
    fetchConversations(data.id);
    setSelectedRoom(data);
  };

  const signOut = () => {
    window.localStorage.removeItem('user');
    setAuthUser(false);
  };

  useEffect(() => setShowLogIn(!auth), [auth]);
  useEffect(() => {
    getRooms().then((data) => {
      setRooms(data);
    });
  }, []);

  return (
    <div>
      <Head>
        <title>Rust with react chat app</title>
        <meta name="description" content="Rust with react chat app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Login show={showLogIn} setAuth={setAuthUser} />
      <div
        className={`${
          !auth && 'hidden'
        } bg-gradient-to-b from-orange-400 to-rose-400 h-screen p-12`}
      >
        <main>
          <Container flex>
            <SidebarContainer>
              <Container alignItems="center" flex>
                <Search placeholder="Buscá lo que quieras" />
                <Spacer size="12" />
                <NewMessageButton />
              </Container>
              <Spacer size="32" />
              <ChatList
                onChatChange={updateMessages}
                userId={auth.id}
                rooms={rooms}
              />
              <button
                onClick={signOut}
                className="text-xs w-full max-w-[295px] p-3 rounded-[10px] bg-violet-200 font-semibold text-violet-600 text-center absolute bottom-5"
              >
                LOG OUT
              </button>
              <p className="text-xs text-center text-gray-400 absolute bottom-0 w-full">
                {auth.username} - {auth.phone}
              </p>
            </SidebarContainer>
            {room?.id && (
              <MainContainer>
                <HeaderContainer>
                  <Header isOnline lastSeen={typingStatus[room?.id] ? 'Typing...' : '10:15 AM'} username={room.users.get_target_user(auth.id)} />
                </HeaderContainer>
                {isLoading && room.id && (
                  <p className="px-4 text-slate-500">Loading conversation...</p>
                )}
                <MessagesContainer>
                  <Conversation data={messages} auth={auth} users={room.users} />
                </MessagesContainer>

                <MessageInputContainer>
                  <MessageInput onSendMessage={submitMessage} />
                </MessageInputContainer>

              </MainContainer>
            )}
          </Container>
        </main>
      </div>
    </div>
  );
}
