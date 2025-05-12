import toast from "react-hot-toast";
import { X, Phone, Video } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const { isCalling, startCall } = useCallStore();

  const handleCall = (type) => {
    if (!selectedUser) {
      return toast.error("No user selected");
    }
    if (!onlineUsers.includes(selectedUser._id)) {
      return toast.error("User is offline");
    }

    startCall(selectedUser, type);
    toast("Initiating call...", { icon: "📞" });
  };

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser?.profilePic || "/avatar.png"}
                alt={selectedUser?.fullName}
              />
            </div>
          </div>

          {/* User Info */}
          <div>
            <h3 className="font-medium">{selectedUser?.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {typingUsers.includes(selectedUser?._id)
                ? "Typing..."
                : onlineUsers.includes(selectedUser?._id)
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Call Buttons */}
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={() => handleCall("audio")}
            title="Audio Call"
            disabled={isCalling}
          >
            <Phone />
          </button>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={() => handleCall("video")}
            title="Video Call"
            disabled={isCalling}
          >
            <Video />
          </button>

          {/* Close Button */}
          <button onClick={() => setSelectedUser(null)}>
            <X />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;