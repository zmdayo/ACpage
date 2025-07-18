document.addEventListener('DOMContentLoaded', function() {
    if (window.innerWidth < 380)
        alert("请注意，本网页在您的设备上可能会出现显示问题。");
    //APlayer加载音乐
    const ap = new APlayer({
        container: document.getElementById('aplayer'),
        fixed: true,
        autoplay: true,
        audio: [{
            name: 'world.execute(me); [Real Instrumental]',
            artist: "Mili // Churitoring's Video Warehouse",
            url: '/static/world_execute_me.ogg',
            cover: '/static/world_execute_me_cover.jpg'
        }]
    });
});