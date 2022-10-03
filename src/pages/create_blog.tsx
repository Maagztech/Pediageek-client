import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootStore, IBlog } from "../utils/TypeScript";
import { validCreateBlog, shallowEqual } from "../utils/Valid";
import { getAPI, postAPI, patchAPI } from "../utils/FetchData";
import NotFound from "../components/global/NotFound";
import ReactQuill from "../components/editor/ReactQuill";

import { ALERT } from "../redux/types/alertType";

import {
  createBlog,
  createDraftdeleteBlog,
  updateBlog,
} from "../redux/actions/blogAction";
import {
  createDraft,
  deleteDraftcreateBlog,
  getDraftsByUserId,
  updateDraft,
  autoDraft,
} from "../redux/actions/draftAction";
import { useHistory } from "react-router-dom";
import CreateBlogabove from "../components/cards/CreateBlogabove";
import BlogPreview from "../components/cards/BlogPreview";
import Helmetglobal from "../components/global/Helmetglobal";
import { imageUpload } from "../utils/ImageUpload";

interface IProps {
  id?: string;
  draft?: boolean;
}
const CreateBlog: React.FC<IProps> = ({ id, draft }) => {
  const initState = {
    user: "",
    title: "",
    content: "",
    description: "",
    thumbnail: "",
    category: "",
    createdAt: new Date().toISOString(),
  };
  const [blog, setBlog] = useState<IBlog>(initState);
  const [body, setBody] = useState("");
  const divRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const { auth, darkMode, draftsUser } = useSelector(
    (state: RootStore) => state
  );
  const dispatch = useDispatch();
  const { isdarkMode } = darkMode;
  const [oldData, setOldData] = useState<IBlog>(initState);
  const history = useHistory();
  useEffect(() => {
    if (auth.access_token)
      if (!id) {
        let newData = {
          ...blog,
          content: body.replaceAll(regex, ""),
        };
        postAPI("draft", newData, auth.access_token).then((res) => {
          history.push(`draft/${res.data._id}`);
          if (auth.user?._id && auth.access_token)
            dispatch(
              getDraftsByUserId(auth.user?._id, "?page=1", auth.access_token)
            );
        });
      } else if (id && draft === undefined) {
        getAPI(`blog/${id}`)
          .then((res) => {
            setBlog(res.data);
            setBody(res.data.content);
            setOldData(res.data);
          })
          .catch((err) => console.log(err));
      } else if (id && draft) {
        getAPI(`draft/${id}`, auth.access_token)
          .then((res) => {
            setBlog(res.data);
            setBody(res.data.content);
            setOldData(res.data);
          })
          .catch((err) => console.log(err));
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  useEffect(() => {
    const div = divRef.current;
    if (!div) return;
    const text = div?.innerText as string;
    setText(text);
  }, [body]);

  const regex = /style=".*?"/gi;
  const handleSubmit = async () => {
    if (!auth.access_token) return;

    const check = validCreateBlog({ ...blog, content: text });
    if (check.errLength !== 0) {
      return dispatch({ type: ALERT, payload: { errors: check.errMsg } });
    }
    const checkbox = document.getElementById(
      "consent"
    ) as HTMLInputElement | null;
    if (checkbox != null) {
      if (!checkbox.checked) {
        return dispatch({
          type: ALERT,
          payload: { errors: "Must accept the Blog Policy." },
        });
      }
    }

    let newData = {
      ...blog,
      content: body.replaceAll(regex, ""),
    };

    if (id && !draft) {
      if (
        blog.user === auth.user?._id ||
        (typeof blog.user !== "string" && blog.user._id === auth.user?._id)
      ) {
      } else
        return dispatch({
          type: ALERT,
          payload: { errors: "Invalid Authentication." },
        });

      const result = shallowEqual(oldData, newData);
      if (result)
        return dispatch({
          type: ALERT,
          payload: { errors: "The data does not change." },
        });
      if (window.confirm("Do you want to Update this post?")) {
        dispatch(updateBlog(newData, auth.access_token));
      }
    } else if (id && draft) {
      if (blog.user !== auth.user?._id)
        return dispatch({
          type: ALERT,
          payload: { errors: "Invalid Authentication." },
        });
      if (window.confirm("Do you want to post this blog?")) {
        let url;
        if (typeof blog.thumbnail !== "string") {
          if (auth.access_token) {
            const photo = await imageUpload(blog.thumbnail, auth.access_token);
            url = photo.url;
          }
        } else {
          url = blog.thumbnail;
        }
        const newBlog = { ...newData, thumbnail: url };
        patchAPI(`drafttoblog/${blog._id}`, newBlog, auth.access_token).then(
          (res) => {
            history.push(`/update_blog/${id}`);
            dispatch(deleteDraftcreateBlog(newData));
          }
        );
      }
    } else {
      await dispatch(createBlog(newData, auth.access_token));
      history.push(`/update_blog/${id}`);
    }
  };

  const handleDraft = async (isauto: Boolean) => {
    if (!auth.access_token) return;
    let newData = {
      ...blog,
      content: body.replaceAll(regex, ""),
    };
    if (id && draft) {
      if (blog.user !== auth.user?._id)
        return dispatch({
          type: ALERT,
          payload: { errors: "Unable to Save Invalid Authentication." },
        });
      const result = shallowEqual(oldData, newData);
      if (result) return;
      if (!isauto) dispatch(updateDraft(newData, auth.access_token));
      else dispatch(autoDraft(newData, auth.access_token));
    } else if (id && draft === undefined && !isauto) {
      if (window.confirm("Do you want to convert draft and delete post?")) {
        await dispatch(createDraftdeleteBlog(newData, auth.access_token));
        history.push(`/draft/${blog._id}`);
      }
    } else if (!isauto) {
      await dispatch(createDraft(newData, auth.access_token));
      history.push(`/draft/${id}`);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      handleDraft(true);
    }, 5000);
    return () => clearTimeout(delayDebounce);
  }, [blog]);
  if (!auth.access_token) return <NotFound />;
  return (
    <>
      <Helmetglobal
        title="Create Blog"
        description="Create blog and your voice heard by world through your writting."
        keyword="blog,blogger,creat blog,"
      />
      <div className="home_page my-2 row justify-content-evenly position-relative">
        <div
          style={{ maxWidth: "622px" }}
          className="col-12 col-lg-7 px-0 my-3"
        >
          <h5 className={`text-${isdarkMode ? "white" : "black"}  text-center`}>
            Start a story...
            <p style={{ fontSize: "10px" }}>
              <i className="fas fa-cloud position-relative"></i>
              Autosave On
            </p>
          </h5>
          <CreateBlogabove blog={blog} setBlog={setBlog} />
          <div
            className="container px-0 position-relative"
            style={{ maxWidth: "750px" }}
          >
            <ReactQuill setBody={setBody} body={body} id={id} />
            <small
              className="text-muted position-absolute"
              style={{ bottom: "3px", right: "7px", opacity: "0.8" }}
            >
              {text.length}/2000
            </small>
          </div>
          <div
            className="accordion mx-auto my-3"
            style={{ maxWidth: 750 }}
            id="accordionExample"
          >
            <h5
              className={`text-${
                isdarkMode ? "white" : "black"
              } my-2 text-center`}
            >
              Preview
            </h5>
            <BlogPreview blog={blog} />
            <div className="accordion-item">
              <h2 className="accordion-header" id="headingThree">
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#collapseThree"
                  aria-expanded="false"
                  aria-controls="collapseThree"
                >
                  Blog Content Preview
                </button>
              </h2>
              <div
                id="collapseThree"
                className="accordion-collapse collapse"
                aria-labelledby="headingThree"
                data-bs-parent="#accordionExample"
              >
                <div className="accordion-body">
                  <h2
                    className="text-center my-3 text-capitalize fs-1"
                    style={{ color: "black", fontSize: 30 }}
                  >
                    <b>{blog.title}</b>
                  </h2>
                  <hr style={{ color: "black" }} />
                  <div className="ql-snow">
                    <div
                      ref={divRef}
                      className="ql-editor p-0"
                      dangerouslySetInnerHTML={{
                        __html: body,
                      }}
                      style={{
                        fontSize: "18px",
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                        color: "black",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="col-12 col-lg-4 position-sticky"
          style={{ maxHeight: "100vh", top: 0 }}
        >
          <div className="mx-auto my-3" style={{ maxWidth: 750 }}>
            <h5
              className={`text-${
                isdarkMode ? "white" : "black"
              } my-2 text-center`}
            >
              Blog Policy
            </h5>
            <div
              className={`blogpolicy bg-${isdarkMode ? "dark" : "light"}`}
              style={{
                borderRadius: 5,
                padding: 10,
                color: isdarkMode ? "white" : "black",
                marginTop: 22,
                minWidth: 250,
              }}
            >
              <ol>
                <li>
                  I have not copied any piece of content from any source
                  available on the internet. The entire content is my own
                  creativity.
                </li>
                <br />
                <li>I have not used any image from the internet in my blog.</li>
                <br />
                <li>
                  I am ensuring that the content is not Violent, Repulsive,
                  Hateful, Abusive, Harassment or Bullying, Harmful, Dangerous
                  or promoting any Terrorism activity.
                </li>
                <br />
                <li>
                  I am aware that if any of the above condition is found wrong
                  in the content, my account may get blocked and the revenue
                  generated from my content will not get paid to me.
                </li>
              </ol>
              <div className="form-check my-2 mx-auto">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="consent"
                  name="consent"
                  value="consent"
                />
                <label className="form-check-label" htmlFor="consent">
                  I accept the above conditions.
                </label>
              </div>

              <button
                className={`btn btn-${isdarkMode ? "light" : "dark"} text-${
                  !isdarkMode ? "light" : "dark"
                } mt-3 d-block mx-auto w-100`}
                onClick={() => handleDraft(false)}
              >
                {id && draft === undefined ? "Convert Draft" : "Save Draft"}
              </button>
              <button
                className={`btn btn-${isdarkMode ? "light" : "dark"} text-${
                  !isdarkMode ? "light" : "dark"
                } mt-3 d-block mx-auto w-100`}
                onClick={handleSubmit}
              >
                {id && !draft ? "Update Post" : "Create Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateBlog;
