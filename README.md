# jquery-widget
## 引入
```html

<!--标签引入-->

<script src="./dist/jquery.js"></script>
<script src="./dist/jquery.widget.js"></script>
````
```javascript

// AMD引入

require(["jquery", "widget"], function(){
  ...    
});
````
## API
```javascript

// 创建一个Dialog组件的示例：
// 使用 bootstrap UI: https://v3.bootcss.com/

require(["jquery", "widget", "bootstrap"], function($){
  
    $.widget("wdt.dialog", {

        options: {        	
            title: "",
            enableClose: true,  //开启右上角关闭按钮 
            backdrop: true,     //点击背景关闭
            keyboard: true,     //按下esc关闭
            fade: true,         //fade动画效果
            size: "",           //尺寸 "lg" "sm"
            content: "",        //内容
            buttons: [          //底部按钮组
                /*
                {
                    text: "取消",
                    classes: 'btn btn-default',
                    click: function(event){...}
                },  
                {
                    text: "确定",
                    classes: 'btn btn-primary',
                    click: function(event){...}
                }     
                */   
            ],

            onClose: null,       //关闭事件
            onComplete: null     //加载完成事件
        },
        	
        templates: {

            main: `
                <div class="modal-dialog {{if size}}modal-{{size}}{{/if}}">
                    <div class="modal-content">
                        {{if title}}{{tmpl "header"}}{{/if}}		    	      
                        <div class="modal-body">{{html content}}</div>
                        {{if buttons.length}}{{tmpl "footer"}}{{/if}}
                    </div>
                </div>
            `,
            
            header: `
                <div class="modal-header">
                    {{if enableClose}}<button class="close"><i class="iconfont icon-close"></i></button>{{/if}}
                    <h4 class="modal-title">{{title}}</h4>
                </div>   
            `,
            
            footer: `
                <div class="modal-footer">
                    {{tmpl(buttons) "button"}}					
                </div>'    
            `,
            
            button: `
                <button class="action {{if size}}{{classes}}{{/if}}">{{text}}</button>     
            `            
        },        

        _create: function(){            
            this.options.classes[this.widgetFullName] = this.options.fade ?  "modal fade" : "modal";
            this._addClass(this.widgetFullName);
            this.element.attr("tabindex", -1);
            
            this._on({
                "click .close": "_clickClose",
                "click .action": "_clickAction"
            });
        },

        _init: function(){            
            if(this.options.content instanceof $){
                this.options.content = this.options.content.outerHtml();
            }            
            
            this.element
                .html(this._tmpl("main", this.options))
                .appendTo("body")
                .modal({
                    keyboard: this.options.keyboard,
                    backdrop: this.options.backdrop
                })
                .on("hidden.bs.modal", function (event) {
                      $(this).modal("removeBackdrop").remove();
                });

            this._trigger('onComplete');
        },
        
        _clickClose: function(event){
            this.destroy();
            this._trigger('onClose');
        },
        
        _clickAction: function(event){
            var that = this;
            var target = $(event.currentTarget);
            var text = target.text();
            var data = this._tmplItem(target).data;
            $.each(that.options.buttons, function(i){
                if(this.text === text && $.isFunction(this.click)){
                    this.click.call(that, event, data);
                }
            });
        },

        _destroy: function(){
            this.element.modal("hide");
        } 
       
    }); 
});
```