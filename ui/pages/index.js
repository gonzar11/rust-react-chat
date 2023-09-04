import Head from "next/head";
import React, { useEffect, useState } from "react";
import Avatar from "../components/avatar";
import ChatList from "../components/rooms";
import Conversation from "../components/conversation";
import Login from "../components/login";
import useConversations from "../libs/useConversation";
import useLocalStorage from "../libs/useLocalStorage";
import useWebsocket from "../libs/useWebsocket";

async function getRooms() {
  try {
    const url = "http://localhost:8080/rooms";
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
  const [auth, setAuthUser] = useLocalStorage("user", false);
  const [isLoading, messages, setMessages, fetchConversations] =
    useConversations("");

  const handleTyping = (mode, roomId) => {
    setTypingStatus((prevStatus) => ({
      ...prevStatus,
      [roomId]: mode === "IN",
    }));

    setRooms((prevData) => {
      return prevData.map((item) => {
        if (item.room.id === roomId) {
          return { ...item, room: { ...item.room, isTyping: mode === "IN" } };
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
      console.log("on message", messageData.chat_type);
      switch (messageData.chat_type) {
        case "TYPING": {
          console.log("value of typing", messageData.value[0]);
          handleTyping(messageData.value[0], messageData.room_id);
          return;
        }
        case "TEXT": {
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
      chat_type: "TYPING",
      value: ["IN"],
      room_id: room.id,
      user_id: auth.id,
    };
    sendMessage(JSON.stringify(data));
  };

  const onFocusChange = () => {
    const data = {
      id: 0,
      chat_type: "TYPING",
      value: ["OUT"],
      room_id: room.id,
      user_id: auth.id,
    };
    sendMessage(JSON.stringify(data));
  };

  const submitMessage = (e) => {
    e.preventDefault();
    let message = e.target.message.value;
    if (message === "") {
      return;
    }

    if (!room.id) {
      alert("Please select chat room!");
      return;
    }

    const data = {
      id: 0,
      chat_type: "TEXT",
      value: [message],
      room_id: room.id,
      user_id: auth.id,
    };
    sendMessage(JSON.stringify(data));
    e.target.message.value = "";
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
    window.localStorage.removeItem("user");
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
          !auth && "hidden"
        } bg-gradient-to-b from-orange-400 to-rose-400 h-screen p-12`}
      >
        <main className="flex w-full max-w-[1020px] h-[700px] mx-auto bg-[#FAF9FE] rounded-[25px] backdrop-opacity-30 opacity-95">
          <aside className="bg-[#F0EEF5] w-[325px] h-[700px] rounded-l-[25px] p-4 overflow-auto relative">
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
          </aside>
          {room?.id && (
            <section className="rounded-r-[25px] w-full max-w-[690px] grid grid-rows-[80px_minmax(450px,_1fr)_65px]">
              <div className="rounded-tr-[25px] w-ful">
                <div className="flex gap-3 p-3 items-center">
                  <Avatar color="rgb(245 158 11)">
                    {room.users.get_target_user(auth.id)}
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-600 text-base">
                      {room.users.get_target_user(auth.id)}
                    </p>
                    <div className="text-xs text-gray-400">
                      {typingStatus[room?.id] ? "Typing..." : "10:15 AM"}
                    </div>
                  </div>
                </div>
                <hr className="bg-[#F0EEF5]" />
              </div>
              {isLoading && room.id && (
                <p className="px-4 text-slate-500">Loading conversation...</p>
              )}
              <Conversation data={messages} auth={auth} users={room.users} />
              <div className="w-full">
                <form
                  onSubmit={submitMessage}
                  className="flex gap-2 items-center rounded-full border border-violet-500 bg-violet-200 p-1 m-2"
                >
                  <input
                    onBlur={onFocusChange}
                    onFocus={updateFocus}
                    name="message"
                    className="p-2 placeholder-gray-600 text-sm w-full rounded-full bg-violet-200 focus:outline-none"
                    placeholder="Type your message here..."
                  />
                  <button
                    type="submit"
                    className="bg-violet-500 rounded-full py-2 px-6 font-semibold text-white text-sm"
                  >
                    Sent
                  </button>
                </form>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
