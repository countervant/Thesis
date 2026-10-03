import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import { newsfeedAPI } from "../services/api.js";
import { unwrapData } from "../utils/queryUtils.js";

export const useNewsfeedQuery = (params = {}, options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.newsfeed(params),
    queryFn: async () => {
      const res = await newsfeedAPI.getPage(params);
      return unwrapData(res);
    },
    ...options,
  });
};

export const useNewsfeedActivityQuery = (options = {}) => {
  return useQuery({
    queryKey: ["newsfeed", "activity"],
    queryFn: async () => {
      const res = await newsfeedAPI.getActivity();
      return unwrapData(res);
    },
    ...options,
  });
};

export const useNewsfeedMutations = () => {
  const queryClient = useQueryClient();

  const invalidateNewsfeedData = () => {
    queryClient.invalidateQueries({ queryKey: ["newsfeed"] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
  };

  const createPost = useMutation({
    mutationFn: (post) => newsfeedAPI.create(post),
    onSuccess: () => invalidateNewsfeedData(),
  });

  const deletePost = useMutation({
    mutationFn: (id) => newsfeedAPI.delete(id),
    onSuccess: () => invalidateNewsfeedData(),
  });

  const toggleHeart = useMutation({
    mutationFn: (postId) => newsfeedAPI.toggleHeart(postId),
    onSuccess: () => invalidateNewsfeedData(),
  });

  const addComment = useMutation({
    mutationFn: ({ postId, text }) => newsfeedAPI.comment(postId, text),
    onSuccess: () => invalidateNewsfeedData(),
  });

  const deleteComment = useMutation({
    mutationFn: ({ postId, commentId }) =>
      newsfeedAPI.deleteComment(postId, commentId),
    onSuccess: () => invalidateNewsfeedData(),
  });

  const toggleCommentHeart = useMutation({
    mutationFn: ({ postId, commentId }) =>
      newsfeedAPI.toggleCommentHeart(postId, commentId),
    onSuccess: () => invalidateNewsfeedData(),
  });

  const replyComment = useMutation({
    mutationFn: ({ postId, commentId, text }) =>
      newsfeedAPI.reply(postId, commentId, text),
    onSuccess: () => invalidateNewsfeedData(),
  });

  return {
    createPost,
    deletePost,
    toggleHeart,
    addComment,
    deleteComment,
    toggleCommentHeart,
    replyComment,
    invalidateNewsfeedData,
  };
};
