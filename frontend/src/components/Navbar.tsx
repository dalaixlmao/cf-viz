import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { URL } from "../config";
export function Navbar({ page }: { page: string }) {
  const [avatar, setAvatar] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    axios
      .get(URL+"/user/nav", {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      })
      .then((res) => {
        setAvatar(res.data.avatar);
      });
  }, []);
  return (
    <div className="w-full bg-white/80 py-3 px-5 backdrop-blur-lg flex flex-row justify-between items-center">
      <div className="flex items-center w-3/5">
        <div
          className="text-xl font-light hover:cursor-pointer"
          onClick={() => {
            navigate("/dashboard");
          }}
        >
          CFviz
        </div>
      </div>
      <div className="w-2/5 flex justify-end">
        {page == "landing" ? (
          <div className="flex flex-row justify-end">
            <button className="bg-blue-900 text-xs font-light text-white rounded-md py-1 px-3 mr-8" onClick={()=>{navigate('/signup')}}>Sign Up</button>
            <button className="bg-blue-900 text-xs font-light text-white rounded-md py-1 px-3" onClick={()=>{navigate('/signin')}}>Sign In</button>
          </div>
        ) : (
          <img
            className="w-8 h-8 rounded-full hover:cursor-pointer"
            onClick={() => {
              navigate("/dashboard");
            }}
            src={avatar}
          />
        )}
      </div>
    </div>
  );
}
