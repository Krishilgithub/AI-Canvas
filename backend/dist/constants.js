"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.PostStatus = exports.Platform = void 0;
var Platform;
(function (Platform) {
    Platform["LINKEDIN"] = "linkedin";
    Platform["TWITTER"] = "twitter";
    Platform["YOUTUBE"] = "youtube";
    Platform["REDDIT"] = "reddit";
    Platform["INSTAGRAM"] = "instagram";
    Platform["SLACK"] = "slack";
})(Platform || (exports.Platform = Platform = {}));
var PostStatus;
(function (PostStatus) {
    PostStatus["DRAFT"] = "draft";
    PostStatus["NEEDS_APPROVAL"] = "needs_approval";
    PostStatus["APPROVED"] = "approved";
    PostStatus["SCHEDULED"] = "scheduled";
    PostStatus["PUBLISHED"] = "published";
    PostStatus["REJECTED"] = "rejected";
    PostStatus["FAILED"] = "failed";
})(PostStatus || (exports.PostStatus = PostStatus = {}));
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "info";
    LogLevel["WARNING"] = "warning";
    LogLevel["ERROR"] = "error";
    LogLevel["SUCCESS"] = "success";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
