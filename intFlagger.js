var http = require('http'),
    fs = require('fs');

var getJSON = function(path, callback) {
    http.get({
        host: 'api.4chan.org',
        port: 80,
        path: '/' + path + '.json'
    }, function(res) {
        res.setEncoding('binary');
        var body = '';
        res.on('data', function(chunk) {
            body += chunk;
        });
        res.on('end', function() {
            try {
                callback(JSON.parse(body));
            } catch (e) {
                console.log('404');
                callback(false);
            }
        });
    }).on('error', function(e) {
        callback(false);
    });
};

var getThreadList = function(page, callback) {
    getJSON('int/' + page, function(data) {
        var out = [];
        var threads = data.threads;
        for(var i = 0, length = threads.length; i < length; i++) {
            out.push(threads[i].posts[0].no);
        }
        callback(out);
    });
};

var getCountriesInThread = function(no, callback) {
    getJSON('int/res/' + no, function(data) {
        if(!data) {
            callback(false);
        } else {
            var out = {};
            var posts = data.posts;
            for(var i = 0, length = posts.length; i < length; i++) {
                if(typeof out[posts[i].country] !== 'undefined')
                    out[posts[i].country].push(no + '#p' + posts[i].no);
                else
                    out[posts[i].country] = [no + '#p' + posts[i].no];
            }
            callback(out);
        }
    });
};

var getCountriesInThreads = function(threads, callback) {
    var countries = {},
        threadsIndex = 0,
        threadInterval = setInterval(function() {
        if(threadsIndex === threads.length) {
            clearInterval(threadInterval);
        } else {
            console.log('Get thread ' + threads[threadsIndex] + ' (' + (threadsIndex + 1) + '/' + threads.length + ')...');
            var count = threadsIndex++;
            getCountriesInThread(threads[count], function(c) {
                if(c) {
                    for(key in c) {
                        if(typeof countries[key] === 'undefined') {
                            countries[key] = c[key];
                        } else {
                            var posts = c[key];
                            for(var i = 0, length = posts.length; i < length; i++) {
                                countries[key].push(posts[i]);
                            }
                        }
                    }
                }
                if(count === threads.length - 1)
                    callback(countries);
            });
        }        
    }, 1100);
};

var threads = [],
    pageCounter = 0,
    pageInterval = setInterval(function() {
    if(pageCounter === 11) {
        clearInterval(pageInterval);
    } else {
        console.log('Get page ' + pageCounter + '...');
        var count = pageCounter++;
        getThreadList(count, function(t) {
            for(var i = 0, length = t.length; i < length; i++) {
                if(threads.indexOf(t[i]) === -1) {
                    threads.push(t[i]);
                }
            }
            if(count === 10) {
                getCountriesInThreads(threads, function(countries) {
                    var html = '<html><head><title>/int/Flagger</title></head><body><ul>';
                    
                    for(key in countries) {
                        html += '<li><img src="https://static.4chan.org/image/country/' + key.toLowerCase() + '.gif" alt="' + key + '"/> (' + countries[key].length + ')<ul style="display:none;">';
                        for(var i = 0, length = countries[key].length; i < length; i++) {
                            html += '<li><a href="http://boards.4chan.org/int/res/' + countries[key][i] + '">' + countries[key][i] + '</a></li>';
                        }
                        html += '</ul></li>';
                    }
                    
                    html += '</ul><script type="text/javascript">' +
                    'var cl = document.querySelectorAll("body > ul > li");' +
                    'for(var i = 0, length = cl.length; i < length; i++) {' +
                    '   cl[i].getElementsByTagName("img")[0].addEventListener("click", function() {' +
                    '       var sublist = this.parentNode.getElementsByTagName("ul")[0];' +
                    '       if(sublist.style.display === "none")' +
                    '           sublist.style.display = "block";' +
                    '       else' +
                    '           sublist.style.display = "none";' +
                    '   });' +
                    '}' +
                    '</script></body></html>';
                    fs.writeFile('output.html', html);
                });
            }
        });
    }
}, 1100);
