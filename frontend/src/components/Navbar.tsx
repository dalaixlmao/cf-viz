import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { URL } from "../config";
export function Navbar() {
  const [avatar, setAvatar] = useState("");
  const [vis, setVis] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    axios
      .get(URL + "/user/nav", {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      })
      .then((res) => {
        setAvatar(res.data.avatar);
      });
  }, []);
  return (
    <div className="transition-all w-full bg-white/80 py-3 px-5 backdrop-blur-lg flex flex-row justify-between items-center">
      <div className="flex items-center w-3/5">
        <div
          className="text-xl font-light hover:cursor-pointer"
          onClick={() => {
            navigate("/");
          }}
        >
          CFviz
        </div>
      </div>
      <div className="w-2/5 flex justify-end">
        {!localStorage.getItem("token") ? (
          <div className="flex flex-row justify-end">
            <button
              className="bg-blue-900 text-xs font-light text-white rounded-md py-1 px-3 mr-8"
              onClick={() => {
                navigate("/signup");
              }}
            >
              Sign Up
            </button>
            <button
              className="bg-blue-900 text-xs font-light text-white rounded-md py-1 px-3"
              onClick={() => {
                navigate("/signin");
              }}
            >
              Sign In
            </button>
          </div>
        ) : avatar != "" ? (
          <img
            className="w-8 h-8 rounded-full hover:cursor-pointer"
            onClick={() => {
              setVis(!vis);
            }}
            src={avatar}
          />
        ) : (
          <div className="w-8 h-8 rounded-full hover:cursor-pointer bg-gray-400"></div>
        )}
        {vis && <div className="w-[200px] py-2 px-2 flex flex-col items-center justify-center bg-white border border-gray/30 rounded-md absolute right-0 top-12">
          <div
            onClick={() => {
              navigate("/dashboard");
              setVis(false);
            }}
            className="border-b transition-all rounded-md hover:bg-black/20 w-full cursor-pointer flex flex-col items-center"
          >
            Profile
          </div>
          <div
            onClick={() => {
              setVis(false);
              localStorage.removeItem("token");
              navigate("/signin");
            }}
            className="w-full transition-all rounded-md flex hover:bg-black/20 cursor-pointer flex-col items-center"
          >
            Log Out
          </div>
        </div>}
      </div>
    </div>
  );
}
