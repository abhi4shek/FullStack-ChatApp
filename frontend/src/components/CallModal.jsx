import React, { useEffect, useRef, useState } from "react";
import { useCallStore } from "../store/useCallStore";
import {
  PhoneIcon,
  PhoneOffIcon,
  TimerIcon,
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
} from "lucide-react";
import toast from "react-hot-toast";

const CallModal = () => {
  const {
    isReceivingCall,
    isCalling,
    isInCall,
    callType,
    caller,
    receiver,
    webrtcOffer,
    webrtcAnswer,
    webrtcIceCandidate,
    acceptCall,
    role,
    rejectCall,
    endCall,
    sendWebRTCOffer,
    sendWebRTCAnswer,
    sendWebRTCIceCandidate,
  } = useCallStore();

  const audioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const modalRef = useRef(null);
  const dragRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 }); // Start near top-left
  const [size, setSize] = useState({ width: 320, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 320, height: 400 });

  const isIncoming = isReceivingCall;
  const showModal = isReceivingCall || isCalling || isInCall;

  // WebRTC Initialization (unchanged)
  const initializeWebRTC = async () => {
    try {
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
            ],
          },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      });

      peerConnectionRef.current.oniceconnectionstatechange = () => {
        console.log(
          "🛤️ ICE connection state:",
          peerConnectionRef.current.iceConnectionState
        );
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && receiver?._id) {
          sendWebRTCIceCandidate(receiver._id, event.candidate);
        }
      };

      peerConnectionRef.current.ontrack = (event) => {
        console.log(
          "📹 Received remote stream:",
          event.streams[0],
          "callType:",
          callType
        );
        if (callType === "video" && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        } else if (callType === "audio") {
          const remoteAudio = new Audio();
          remoteAudio.srcObject = event.streams[0];
          remoteAudio.play().catch((e) => {
            // console.error("Failed to play remote audio:", e);
            toast.error("Failed to play remote audio");
          });
        }
      };

      const constraints = { audio: true, video: callType === "video" };
      const stream = await navigator.mediaDevices
        .getUserMedia(constraints)
        .catch((e) => {
          // console.error("Failed to access media:", e);
          toast.error("Failed to access camera or microphone");
          endCall();
          throw e;
        });
      localStreamRef.current = stream;
      // console.log("🎤 Local stream acquired:", stream.getTracks());
      if (localVideoRef.current && callType === "video") {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => {
        // console.log("➕ Adding track to peer connection:", track);
        peerConnectionRef.current.addTrack(track, stream);
        track.enabled = track.kind === "audio" ? !isMuted : !isCameraOff;
      });
      // console.log("📡 Peer connection initialized:", peerConnectionRef.current);
      if (role === "caller") {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        if (receiver?._id) {
          // console.log("📡 Sending WebRTC offer to:", receiver._id, offer);
          sendWebRTCOffer(receiver._id, offer);
        }
      }

      if (isInCall && callType === "audio") {
        console.log("🔈 Testing local stream playback");
        const testAudio = new Audio();
        testAudio.srcObject = localStreamRef.current;
        testAudio.play().catch((e) => console.error("Test audio failed:", e));
      }
    } catch (error) {
      // console.error("WebRTC initialization failed:", error);
      toast.error("Failed to start call");
      endCall();
    }
  };

  // WebRTC Cleanup (unchanged)
  const cleanupWebRTC = () => {
    console.log("🧹 Cleaning up WebRTC");
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  // Dragging Logic
  const startDragging = (e) => {
    if (e.target === dragRef.current) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const onDrag = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: boundedX, y: boundedY });
    }
  };

  const stopDragging = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // Resizing Logic
  const startResizing = (e, handle) => {
    setIsResizing(true);
    setResizeHandle(handle);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
    // console.log(
    //   "📏 Started resizing modal at:",
    //   { x: e.clientX, y: e.clientY },
    //   "handle:",
    //   handle
    // );
  };

  const onResize = (e) => {
    if (isResizing) {
      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;
      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      let newX = position.x;
      let newY = position.y;

      if (resizeHandle.includes("right")) {
        newWidth = Math.max(
          200,
          Math.min(
            resizeStartRef.current.width + deltaX,
            window.innerWidth - position.x
          )
        );
      }
      if (resizeHandle.includes("left")) {
        newWidth = Math.max(
          200,
          Math.min(
            resizeStartRef.current.width - deltaX,
            position.x + resizeStartRef.current.width
          )
        );
        newX = position.x + (resizeStartRef.current.width - newWidth);
      }
      if (resizeHandle.includes("bottom")) {
        newHeight = Math.max(
          200,
          Math.min(
            resizeStartRef.current.height + deltaY,
            window.innerHeight - position.y
          )
        );
      }
      if (resizeHandle.includes("top")) {
        newHeight = Math.max(
          200,
          Math.min(
            resizeStartRef.current.height - deltaY,
            position.y + resizeStartRef.current.height
          )
        );
        newY = position.y + (resizeStartRef.current.height - newHeight);
      }

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
      // console.log("📏 Resizing modal to:", {
      //   width: newWidth,
      //   height: newHeight,
      //   x: newX,
      //   y: newY,
      // });
    }
  };

  const stopResizing = () => {
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
    }
  };

  // Event Listeners for Dragging and Resizing
  useEffect(() => {
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDragging);
    document.addEventListener("mousemove", onResize);
    document.addEventListener("mouseup", stopResizing);
    return () => {
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", stopDragging);
      document.removeEventListener("mousemove", onResize);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [isDragging, isResizing]);

  // Modal Rendering and State Logging
  useEffect(() => {
    console.log("🛠️ CallModal component mounted");
    return () => console.log("🛠️ CallModal component unmounted");
  }, []);

  useEffect(() => {
    const unsubscribe = useCallStore.subscribe((state, prevState) => {
      // console.log("🔄 CallStore state changed:", {
      //   isReceivingCall: state.isReceivingCall,
      //   isCalling: state.isCalling,
      //   isInCall: state.isInCall,
      //   caller: state.caller,
      //   receiver: state.receiver,
      //   reason: state.reason,
      // });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // useEffect(() => {
  //   console.log("🎨 CallModal rendering attempt:", {
  //     showModal,
  //     isReceivingCall,
  //     isCalling,
  //     isInCall,
  //     caller,
  //     receiver,
  //     callType,
  //     position,
  //     size,
  //   });
  //   if (isReceivingCall && !showModal) {
  //     console.warn("⚠️ isReceivingCall is true but showModal is false");
  //   }
  //   if (modalRef.current && showModal) {
  //     const styles = window.getComputedStyle(modalRef.current);
  //     console.log("🖼️ Modal DOM styles:", {
  //       display: styles.display,
  //       top: styles.top,
  //       left: styles.left,
  //       width: styles.width,
  //       height: styles.height,
  //       zIndex: styles.zIndex,
  //       opacity: styles.opacity,
  //     });
  //   }
  // }, [
  //   showModal,
  //   isReceivingCall,
  //   isCalling,
  //   isInCall,
  //   caller,
  //   receiver,
  //   callType,
  //   position,
  //   size,
  // ]);

  // Ringtone Handling
  useEffect(() => {
    if (isIncoming && audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch((e) => {
        console.error("Ringtone playback failed:", e);
        toast.error("Unable to play ringtone");
      });
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [isIncoming]);

  // Call Duration
  useEffect(() => {
    let interval;
    if (isInCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isInCall]);

  // WebRTC Setup
  useEffect(() => {
    // console.log("🧩 isInCall changed:", isInCall);
    // console.log("📡 peerConnectionRef BEFORE init:", peerConnectionRef.current);

    if (isInCall) {
      cleanupWebRTC(); // 🔁 Ensure fresh setup
      initializeWebRTC();
    } else {
      cleanupWebRTC();
    }
  }, [isInCall]);

  // WebRTC Signaling
  useEffect(() => {
    if (webrtcOffer && peerConnectionRef.current) {
      const { fromUserId, offer } = webrtcOffer;
      peerConnectionRef.current
        .setRemoteDescription(new RTCSessionDescription(offer))
        .then(async () => {
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          sendWebRTCAnswer(fromUserId, answer);
        })
        .catch((e) => {
          toast.error("Failed to process call offer");
        });
    }
  }, [webrtcOffer, sendWebRTCAnswer]);

  useEffect(() => {
    if (webrtcAnswer && peerConnectionRef.current) {
      const { answer } = webrtcAnswer;
      peerConnectionRef.current
        .setRemoteDescription(new RTCSessionDescription(answer))
        .catch((e) => {
          toast.error("Failed to process call answer");
        });
    }
  }, [webrtcAnswer]);

  useEffect(() => {
    if (webrtcIceCandidate && peerConnectionRef.current) {
      const { candidate } = webrtcIceCandidate;
      peerConnectionRef.current
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch((e) => {
          toast.error("Failed to add ICE candidate");
        });
    }
  }, [webrtcIceCandidate]);

  // Call State Toasts
  useEffect(() => {
    const unsubscribe = useCallStore.subscribe((state, prevState) => {
      if (prevState.isCalling && !state.isCalling && !state.isInCall) {
        if (state.reason === "timeout") {
          toast.error("Call timed out");
        } else if (state.reason === "disconnected") {
          toast.error("Call ended: User disconnected");
        } else if (state.reason === "declined") {
          toast.error("Call declined");
        }
      }
      if (!prevState.isReceivingCall && state.isReceivingCall) {
        toast("Incoming call...", { icon: "📞" });
      }
      if (state.isUnavailable) {
        toast.error(`Call unavailable: ${state.unavailableReason}`);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Mute and Camera Toggles
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current && callType === "video") {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const formatTime = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60
    ).padStart(2, "0")}`;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.3)", // Lighter overlay
        zIndex: 999, // Below modal
        pointerEvents: "none", // Allow clicks through
        display: showModal ? "block" : "none",
      }}
    >
      <div
        ref={modalRef}
        style={{
          position: "absolute",
          top: `${position.y}px`,
          left: `${position.x}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          backgroundColor: "white",
          borderRadius: "0.5rem",
          boxShadow: "0 10px 15px rgba(0, 0, 0, 0.2)",
          zIndex: 1000, // Above overlay
          willChange: "transform",
          pointerEvents: "auto", // Modal is interactive
        }}
      >
        <div
          ref={dragRef}
          style={{
            backgroundColor: "#e5e7eb",
            padding: "0.5rem",
            cursor: "move",
            borderBottom: "1px solid #d1d5db",
            textAlign: "center",
          }}
          onMouseDown={startDragging}
        >
          <h3
            style={{
              fontWeight: "bold",
              fontSize: "1.125rem",
              color: "black",
              margin: 0,
            }}
          >
            {isIncoming
              ? caller?.fullName || "Unknown Caller"
              : isCalling
              ? "Calling..."
              : receiver?.fullName || "In Call"}
          </h3>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {isInCall ? (
            callType === "video" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  margin: "0.75rem 0",
                }}
              >
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: `${size.height - 150}px`,
                    backgroundColor: "black",
                    borderRadius: "0.25rem",
                    objectFit: "contain",
                  }}
                />
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: "6rem",
                    height: "4rem",
                    backgroundColor: "black",
                    borderRadius: "0.25rem",
                    position: "absolute",
                    bottom: "1rem",
                    right: "1rem",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  margin: "0.75rem 0",
                }}
              >
                <div style={{ width: "5rem", borderRadius: "9999px" }}>
                  <img
                    src={
                      receiver?.profilePic ||
                      caller?.profilePic ||
                      "/avatar.png"
                    }
                    alt={receiver?.fullName || caller?.fullName || "Caller"}
                    style={{ width: "100%", borderRadius: "9999px" }}
                  />
                </div>
              </div>
            )
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                margin: "0.75rem 0",
              }}
            >
              <div style={{ width: "5rem", borderRadius: "9999px" }}>
                <img
                  src={caller?.profilePic || "/avatar.png"}
                  alt={caller?.fullName || "Caller"}
                  style={{ width: "100%", borderRadius: "9999px" }}
                />
              </div>
            </div>
          )}

          <p
            style={{
              fontSize: "0.875rem",
              textAlign: "center",
              textTransform: "capitalize",
              marginBottom: "0.5rem",
              color: "black",
            }}
          >
            {isInCall ? "In Call" : `${callType} call`}
          </p>

          {isInCall && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.25rem",
                fontSize: "0.875rem",
                color: "#16a34a",
                marginBottom: "0.75rem",
              }}
            >
              <TimerIcon size={16} />
              <span>{formatTime(callDuration)}</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              marginTop: "0.75rem",
            }}
          >
            {isIncoming ? (
              <>
                <button
                  style={{
                    backgroundColor: "#16a34a",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.25rem",
                  }}
                  onClick={() => {
                    acceptCall();
                    toast.success("Call accepted");
                  }}
                >
                  <PhoneIcon size={16} />
                </button>
                <button
                  style={{
                    backgroundColor: "#ef4444",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.25rem",
                  }}
                  onClick={() => {
                    rejectCall();
                    toast.error("Call declined");
                  }}
                >
                  <PhoneOffIcon size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  style={{
                    backgroundColor: "#ef4444",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.25rem",
                  }}
                  onClick={() => {
                    endCall();
                    toast("Call ended", { icon: "✖️" });
                  }}
                >
                  <PhoneOffIcon size={16} />
                </button>
                {isInCall && (
                  <>
                    <button
                      style={{
                        backgroundColor: isMuted ? "#ef4444" : "#16a34a",
                        color: "white",
                        padding: "0.5rem 1rem",
                        borderRadius: "0.25rem",
                      }}
                      onClick={toggleMute}
                    >
                      {isMuted ? (
                        <MicOffIcon size={16} />
                      ) : (
                        <MicIcon size={16} />
                      )}
                    </button>
                    {callType === "video" && (
                      <button
                        style={{
                          backgroundColor: isCameraOff ? "#ef4444" : "#16a34a",
                          color: "white",
                          padding: "0.5rem 1rem",
                          borderRadius: "0.25rem",
                        }}
                        onClick={toggleCamera}
                      >
                        {isCameraOff ? (
                          <VideoOffIcon size={16} />
                        ) : (
                          <VideoIcon size={16} />
                        )}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {callType === "video" && (
            <>
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: "10px",
                  height: "10px",
                  backgroundColor: "#6b7280",
                  cursor: "se-resize",
                  zIndex: 1001,
                }}
                onMouseDown={(e) => startResizing(e, "bottom-right")}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "10px",
                  height: "10px",
                  backgroundColor: "#6b7280",
                  cursor: "nw-resize",
                  zIndex: 1001,
                }}
                onMouseDown={(e) => startResizing(e, "top-left")}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "10px",
                  height: "10px",
                  backgroundColor: "#6b7280",
                  cursor: "ne-resize",
                  zIndex: 1001,
                }}
                onMouseDown={(e) => startResizing(e, "top-right")}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "10px",
                  height: "10px",
                  backgroundColor: "#6b7280",
                  cursor: "sw-resize",
                  zIndex: 1001,
                }}
                onMouseDown={(e) => startResizing(e, "bottom-left")}
              />
            </>
          )}
        </div>

        <audio ref={audioRef} src="/ringtone.mp3" preload="auto" />
      </div>
    </div>
  );
};

export default CallModal;
