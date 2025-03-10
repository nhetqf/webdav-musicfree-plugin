const mm = require('music-metadata');
const { createClient } = require('webdav'); // 假设使用 WebDAV 获取音频文件

// 假设从环境变量获取 WebDAV 配置
const { url, username, password } = {
    url: 'your_webdav_url',
    username: 'your_username',
    password: 'your_password'
};

const client = createClient(url, {
    authType: 'Password',
    username,
    password
});

// 搜索音乐
async function searchMusic(query) {
    try {
        // 模拟搜索逻辑，这里需要根据实际 WebDAV 目录结构和搜索需求修改
        const files = await client.getDirectoryContents('/');
        const musicFiles = files.filter(file => file.type === 'file' && file.mime.startsWith('audio'));
        const results = musicFiles.filter(file => file.basename.includes(query)).map(file => ({
            title: file.basename,
            id: file.filename,
            artist: '未知艺术家',
            album: '未知专辑'
        }));
        return {
            isEnd: true,
            data: results
        };
    } catch (error) {
        console.error('搜索音乐出错:', error);
        return {
            isEnd: true,
            data: []
        };
    }
}

// 获取音乐详情（包含封面和歌词）
async function getMusicInfo(musicItem) {
    try {
        const songPath = musicItem.id;
        const stream = await client.createReadStream(songPath);
        const metadata = await mm.parseStream(stream, { duration: false });

        const cover = metadata.common.picture && metadata.common.picture.length > 0
           ? metadata.common.picture[0]
            : null;
        const lyrics = metadata.common.lyrics;

        let albumCover = null;
        if (cover) {
            albumCover = `data:${cover.format};base64,${cover.data.toString('base64')}`;
        }

        let rawLrc = null;
        if (lyrics) {
            let lyricText = '';
            for (const lyric of lyrics) {
                if (lyric.syncText) {
                    for (const sync of lyric.syncText) {
                        if (sync.text) {
                            lyricText += `${sync.text}\n`;
                        }
                    }
                }
            }
            rawLrc = lyricText;
        }

        return {
            albumCover,
            rawLrc
        };
    } catch (error) {
        console.error('获取音乐信息出错:', error);
        return {
            albumCover: null,
            rawLrc: null
        };
    }
}

// 获取音频源
function getMediaSource(musicItem) {
    return {
        url: client.getFileDownloadLink(musicItem.id)
    };
}

module.exports = {
    platform: "MyMusicPlugin",
    author: "YourName",
    description: "支持封面和歌词的 MusicFree 插件",
    userVariables: [
        {
            key: "url",
            name: "WebDAV 地址",
        },
        {
            key: "username",
            name: "用户名",
        },
        {
            key: "password",
            name: "密码",
            type: "password"
        }
    ],
    version: "0.0.1",
    supportedSearchType: ["music"],
    search(query, page, type) {
        if (type === "music") {
            return searchMusic(query);
        }
    },
    getMusicInfo,
    getMediaSource
};