import { useNavigate } from "react-router-dom";
import { getUser, deletePost } from "./data/api.js";

// 내가 쓴 글에만 보이는 삭제 버튼
export default function DeleteButton({ post }) {
  const navigate = useNavigate();
  const me = getUser();
  if (!me || !post.authorId || post.authorId !== me.userId) return null;
  async function remove() {
    if (!window.confirm("이 글을 삭제할까요? 댓글과 좋아요도 함께 사라져요.")) return;
    try {
      await deletePost(post.id, me.userId);
      navigate("/community");
    } catch (e) {
      alert(e.message);
    }
  }
  return <span onClick={remove} style={{ cursor: "pointer", marginLeft: "auto", color: "#C4412F" }}>삭제</span>;
}
