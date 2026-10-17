import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/header.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import CommunityHome from "./pages/community/CommunityHome.jsx";
import ReviewDetail from "./pages/community/ReviewDetail.jsx";
import QuestionDetail from "./pages/community/QuestionDetail.jsx";
import PlaceReviews from "./pages/community/PlaceReviews.jsx";
import Write from "./pages/community/Write.jsx";
import TalkDetail from "./pages/community/TalkDetail.jsx";
import MyTrip from "./pages/mytrip/MyTrip.jsx";
import Home from "./pages/Home.jsx";
import SearchResults from "./pages/SearchResults.jsx";
import TrendingPlaceDetail from "./pages/TrendingPlaceDetail.jsx";
import SessionEdit from "./pages/local-eum/SessionEdit.jsx";
import HostProfileEdit from "./pages/local-eum/HostProfileEdit.jsx";
import ExperienceCatalog from "./pages/local-eum/ExperienceCatalog.jsx";
import ExperienceDetail from "./pages/local-eum/ExperienceDetail.jsx";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/trending/:id" element={<TrendingPlaceDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/community" element={<CommunityHome />} />
        <Route path="/community/write" element={<Write />} />
        <Route path="/community/talks/:id" element={<TalkDetail />} />
        <Route path="/community/reviews/:id" element={<ReviewDetail />} />
        <Route path="/community/questions/:id" element={<QuestionDetail />} />
        <Route path="/community/places/:id/reviews" element={<PlaceReviews />} />
        <Route path="/places/:id" element={<PlaceReviews />} />
        <Route path="/mytrip" element={<MyTrip />} />
        <Route path="/local-eum/host/sessions/:sessionId/edit" element={<SessionEdit />} />
        <Route path="/local-eum/host/profile" element={<HostProfileEdit />} />
        <Route path="/local-eum" element={<ExperienceCatalog />} />
        <Route path="/local-eum/experiences/:experienceId" element={<ExperienceDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
