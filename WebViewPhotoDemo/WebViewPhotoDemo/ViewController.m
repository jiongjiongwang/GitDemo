//
//  ViewController.m
//  WebViewPhotoDemo
//
//  Created by 王炯 on 2017/4/25.
//  Copyright © 2017年 王炯. All rights reserved.
//

#import "ViewController.h"

@interface ViewController ()<UIWebViewDelegate,UINavigationControllerDelegate,UIImagePickerControllerDelegate>
{
    UIWebView* _webView;
}

//相册类
@property (nonatomic,strong)UIImagePickerController *picker_library_;

//回调函数
@property (nonatomic,copy)NSString *callBackFun;


@end

@implementation ViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    _webView = [[UIWebView alloc] initWithFrame:CGRectMake(0, 0, CGRectGetWidth(self.view.bounds) - 50*CGRectGetWidth(self.view.bounds)/CGRectGetHeight(self.view.bounds), CGRectGetHeight(self.view.bounds) - 50)];
    
    [self.view addSubview:_webView];
    
    _webView.delegate = self;
    
    //_webView.scalesPageToFit = YES;
    
    
    
    [_webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"http://m.hd.2144.cn/act/bindmobile/ssmtl"]]];
    
    //[_webView reload];
    
    
    //[_webView loadRequest:[NSURLRequest requestWithURL:[[NSBundle mainBundle]URLForResource:@"index222.html" withExtension:nil]]];
    
    
    UIButton *myButton = [[UIButton alloc] initWithFrame:CGRectMake(0, CGRectGetHeight(self.view.bounds) - 50, 100, 50)];
    
    [myButton setBackgroundColor:[UIColor redColor]];
    
    [myButton setTitle:@"按钮" forState:UIControlStateNormal];
    
    [self.view addSubview:myButton];
    
    [myButton addTarget:self action:@selector(myButtonClick:) forControlEvents:UIControlEventTouchUpInside];

    
}

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
{
    
    NSURL *url = request.URL;
    
    //(1)协议:mySources
    NSString *scheme = url.scheme;
    NSLog(@"scheme=%@",scheme);
    
    
    
     //网页的上传图片
     if ([scheme isEqualToString:@"uploadimg"])
     {
         NSLog(@"三生选美点击上传");
         
         //获取其中所要调用的方法和参数
         //取剩下的字符串信息
         NSString *subStr = [[url absoluteString] substringFromIndex:10];
         
         //1-先取参数2(回调方法)
         NSArray *components = [subStr componentsSeparatedByString:@"&"];
         
         NSString *para2 = [components lastObject];
         
         NSLog(@"%@",para2);
         
         
         
         //2-再取参数1(POST网页地址)
         //参数2在字符串中的位置
         NSRange range = [subStr rangeOfString:para2];
         NSUInteger location = range.location;
         
         NSString *param1 = [subStr substringToIndex:location-1];
         
         NSLog(@"%@",param1);
         
         
         [self openGallery];
     }
     //分享图片
     else if ([scheme isEqualToString:@"sharesocial"])
     {
         NSLog(@"点击分享按钮");
         
         //获取其中所要调用的方法和参数
         //取剩下的字符串信息
         NSString *subStr = [[url absoluteString] substringFromIndex:12];
         
         //剩下的都是参数
         NSLog(@"%@",subStr);

     }
    
    return YES;
}


#pragma mark----相册
//打开相册
-(void)openGallery
{
    //初始化类
    _picker_library_ = [[UIImagePickerController alloc] init];
    
    //指定几总图片来源
    //UIImagePickerControllerSourceTypePhotoLibrary：表示显示所有的照片。
    //UIImagePickerControllerSourceTypeCamera：表示从摄像头选取照片。
    //UIImagePickerControllerSourceTypeSavedPhotosAlbum：表示仅仅从相册中选取照片。
    
    
    _picker_library_.sourceType = UIImagePickerControllerSourceTypeSavedPhotosAlbum;
    
    
    
    [self presentViewController:_picker_library_ animated:YES completion:nil];
    
    //代理
    _picker_library_.delegate = self;
    
}

//选取图片
- (void)imagePickerController:(UIImagePickerController *)picker didFinishPickingMediaWithInfo:(NSDictionary<NSString *,id> *)info
{
    //照片的相关信息存放在info字典中
    //取出被选中的照片
    UIImage *selectedImage = info[UIImagePickerControllerOriginalImage];
    
    //dismiss掉照片框
    [self dismissViewControllerAnimated:YES completion:nil];
    
    NSLog(@"选取到了图片%@",selectedImage);
    
    //({"flag":-11,"msg":"\u7528\u6237\u4fe1\u606f\u6216\u5934\u50cf\u6ca1\u6709\u901a\u8fc7\u5ba1\u6838"})
    //NSLog(@"responseObject:%@",str);
    
    //调用网页的JS代码
    //判断网页有没有加载完成
    
        NSString *str = @"({\"flag\":-11,\"msg\":\"\u7528\u6237\u4fe1\u606f\u6216\u5934\u50cf\u6ca1\u6709\u901a\u8fc7\u5ba1\u6838\"})";
    
        _callBackFun = @"upload_avatar";
        
        //利用回调方法拼接参数
        NSString *JSParameter = [NSString stringWithFormat:@"%@%@",_callBackFun,str];
        
        NSLog(@"%@",JSParameter);
        
    [_webView stringByEvaluatingJavaScriptFromString:JSParameter];
    
}

#pragma mark-----分享

-(void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error
{
    NSLog(@"webView加载error:%@",error);
    
    NSLog(@"error.userInfo = %@",error.userInfo);
    
}

- (void)webViewDidStartLoad:(UIWebView *)webView;
{
    NSLog(@"加载开始");
}
- (void)webViewDidFinishLoad:(UIWebView *)webView;
{
    NSLog(@"加载结束");
    
    /*
    NSString *str = @"('1234')";
    
    NSString *callBackf = @"webbb";
    
    NSString *JSCodeStr = [NSString stringWithFormat:@"%@%@",callBackf,str];
    
    //NSString *JSCodeStr = @"alert(webbb('hhh'));$('.btn-reward').innerHTML = '54321';";
    
    NSString *result = [_webView stringByEvaluatingJavaScriptFromString:JSCodeStr];
    
    NSLog(@"结果=%@",result);
    */
    

    //NSString *str = @"('ggegegs')";
    
    NSString *str = [NSString stringWithFormat:@"({uid:'%@'})",
                     @"abcdef"];
    
    
    NSString *callBackf = @"IOSShare";
    
    NSString *JSCodeStr = [NSString stringWithFormat:@"%@%@",callBackf,str];
    
    //NSString *JSCodeStr = @"alert(webbb('hhh'));$('.btn-reward').innerHTML = '54321';";
    
    //NSLog(@"%@",JSCodeStr);
    
    NSString *result = [_webView stringByEvaluatingJavaScriptFromString:JSCodeStr];
    
    NSLog(@"结果=%@",result);
    
    
    /*
    NSString *str = @"('1234abcdefg')";
    
    _callBackFun = @"upload_avatar";
    
    //利用回调方法拼接参数
    NSString *JSParameter = [NSString stringWithFormat:@"%@%@",_callBackFun,str];
    
    //NSLog(@"%@",JSParameter);
    
    NSString *result = [_webView stringByEvaluatingJavaScriptFromString:JSParameter];
    
    NSLog(@"结果=%@",result);
    */
}

-(void)myButtonClick:(UIButton *)button
{
    NSString *str = @"('abcdefg')";
    
    NSString *callBackf = @"upload_avatar";
    
    NSString *JSCodeStr = [NSString stringWithFormat:@"%@%@",callBackf,str];
    
    //NSString *JSCodeStr = @"alert(webbb('hhh'));$('.btn-reward').innerHTML = '54321';";
    
    NSString *result = [_webView stringByEvaluatingJavaScriptFromString:JSCodeStr];
    
    NSLog(@"结果=%@",result);
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
}


@end
