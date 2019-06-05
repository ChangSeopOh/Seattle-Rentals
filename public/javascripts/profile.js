let verifyPassword;
const submitBtn = document.getElementById('update-profile');
			//document.getElementById('form-id') is also working;
const newPassword = document.getElementById('new-password');			
const confirmation = document.getElementById('password-confirmation');			
const validationMessage = document.getElementById('validation-message');			
							//input event, and callback function
function validatePasswords(message, add, remove){
	validationMessage.textContent = message;
	validationMessage.classList.add(add);
	validationMessage.classList.remove(remove);	
};

var checkPassword = function(){
	verifyPassword = newPassword.value ===confirmation.value ? true : false;
	
	if(!verifyPassword){
		validatePasswords('Passwords must match!','color-red','color-green');
		submitBtn.setAttribute('disabled', true);
	}else if((newPassword.value==='')&&(confirmation.value==='')){
		validatePasswords('');
		submitBtn.removeAttribute('disabled');
	}else{
		validatePasswords('Passwords match!','color-green','color-red');
		submitBtn.removeAttribute('disabled');
	}
	//add password-rule later. 
};

newPassword.addEventListener('input',e=>{
	checkPassword();
});
confirmation.addEventListener('input',e=>{
	checkPassword();
});


