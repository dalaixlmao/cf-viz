import { useEffect, useState } from "react";
import Card from "../components/Card";
import axios from "axios";
import NameComponent from "../components/NameComponent";
import RatingComponent from "../components/RatingComponent";
import { Rank } from "../components/RatingComponent";
import ColumnChart from "../components/ColumnChart";
import PieChart from "../components/PieChart";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import LoaderDashboard from "../components/LoaderDashboard";
import ErrorComponent from "../components/ErrorComponent";
import { URL } from "../config";

export default function HandleBoard() {
  const [avatar, setAvatar] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [rating, setRating] = useState(0);
  const [maxRating, setMaxRating] = useState(0);
  const [rank, setRank] = useState<Rank>("newbie");
  const [maxRank, setMaxRank] = useState<Rank>("newbie");
  const [tagRating, setTagRating] = useState({});
  const navigate = useNavigate();
  const [param] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorM, setErrorM] = useState("");

  setError(true);
        if (e.response.data) setErrorM(e.response.data.message);
        else setErrorM(e.message);
        console.log();
        const temp = error;
        console.log(temp);
  return (
    <div className="w-full h-full flex flex-col items-center md:bg-cfbg md:bg-no-repeat md:bg-y-repeat md:bg-cover bg-blue-300 md:bg-center">
      <Navbar page={"dashboard"} />
      <div className="absolute top-14">
        {errorM == "" ? <></> : <ErrorComponent message={errorM} />}
      </div>
      <div className="flex flex-row items-center justify-center w-4/5 mt-5">
        <input
          className="w-full md:w-1/3 bg-white z-2 py-2 px-3 rounded-lg shadow-2xl"
          type="text"
          placeholder="Search handle"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const target = e.target as HTMLInputElement;
              setHandle(target.value);
              navigate("/user/?handle=" + (target.value ? target.value : ""));
            }
          }}
        />
      </div>

      <div className="flex justify-center items-center w-full md:w-4/5 mt-5 bg-white rounded-xl">
        {" "}
        {loading ? (
          <LoaderDashboard />
        ) : (
          <Card width="full h-auto md:rounded-xl">
            <div className="flex flex-col md:flex-row md:items-start items-center">
              <NameComponent avatar={avatar} name={name} handle={handle} />
            </div>

            <RatingComponent
              rating={rating}
              maxRank={maxRank}
              rank={rank}
              maxRating={maxRating}
            />
            <div className="w-full flex md:flex-row flex-col justify-between items-center">
              <ColumnChart data={tagRating} />
              <PieChart data={tagRating} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
